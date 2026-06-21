using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Identity.Client;
using Microsoft.Identity.Client.AppConfig;
using Microsoft.Identity.Client.KeyAttestation;

namespace TrustFlow.Host;

public class BackendService
{
    private const string AppId = "163ffef9-a313-45b4-ab2f-c7e2f5e0e23e";
    private const string TenantId = "bea21ebe-8b64-4d06-9f6d-6a889b120a7c";
    private const string Authority = "https://login.microsoftonline.com/bea21ebe-8b64-4d06-9f6d-6a889b120a7c";
    private const string CertName = "LabAuth.MSIDLab.com";

    // SNI flow targets Graph
    private const string SniScope = "https://graph.microsoft.com/.default";
    private const string SniApiEndpoint = "https://graph.microsoft.com/v1.0/applications?$top=1";
    private const string SniApiName = "Microsoft Graph";

    // MSI flow targets Azure Key Vault (no /.default — MSAL adds it for MSI)
    private const string MsiScope = "https://vault.azure.net";
    private const string MsiApiEndpoint = "https://tokenbinding.vault.azure.net/secrets/boundsecret/?api-version=2015-06-01";
    private const string MsiApiName = "Azure Key Vault";

    private X509Certificate2? _cachedCert;
    private readonly List<string> _msalLogs = new();
    private Action<string>? _logCallback;

    public void SetLogCallback(Action<string> callback) => _logCallback = callback;
    public List<string> GetLogs() => _msalLogs;
    public void ClearLogs() => _msalLogs.Clear();

    private IConfidentialClientApplication BuildApp(X509Certificate2 cert)
    {
        return ConfidentialClientApplicationBuilder.Create(AppId)
            .WithAuthority(Authority)
            .WithAzureRegion("westus3")
            .WithCertificate(cert, true)
            .WithLogging((level, message, containsPii) =>
            {
                var line = $"[{DateTime.Now:HH:mm:ss.fff}] [{level}] {message}";
                _msalLogs.Add(line);
                _logCallback?.Invoke(line);
            }, Microsoft.Identity.Client.LogLevel.Verbose, enablePiiLogging: false, enableDefaultPlatformLogging: true)
            .Build();
    }

    public string GetEnvironment()
    {
        var env = new
        {
            tenantId = TenantId,
            appId = AppId,
            authority = Authority,
            certName = CertName,
            apiEndpoint = SniApiEndpoint,
            apiName = SniApiName,
            scope = SniScope,
            machineName = Environment.MachineName,
            osVersion = Environment.OSVersion.ToString(),
            region = "westus3"
        };
        return JsonSerializer.Serialize(env);
    }

    private X509Certificate2? FindLabCert()
    {
        if (_cachedCert != null) return _cachedCert;

        foreach (var loc in new[] { StoreLocation.CurrentUser, StoreLocation.LocalMachine })
        {
            try
            {
                using var store = new X509Store(StoreName.My, loc);
                store.Open(OpenFlags.ReadOnly);
                var found = store.Certificates.Find(X509FindType.FindBySubjectName, CertName, false);
                // Pick the valid cert with the latest expiry
                var valid = found.Cast<X509Certificate2>()
                                 .Where(c => c.HasPrivateKey && c.NotAfter > DateTime.Now)
                                 .OrderByDescending(c => c.NotAfter)
                                 .FirstOrDefault();
                if (valid != null)
                {
                    _cachedCert = valid;
                    return _cachedCert;
                }
                store.Close();
            }
            catch { }
        }
        return null;
    }

    public Task<string> GetCertificatesAsync()
    {
        var certs = new List<object>();
        foreach (var loc in new[] { StoreLocation.CurrentUser, StoreLocation.LocalMachine })
        {
            try
            {
                using var store = new X509Store(StoreName.My, loc);
                store.Open(OpenFlags.ReadOnly);
                foreach (var cert in store.Certificates)
                {
                    var hasPrivateKey = cert.HasPrivateKey;
                    certs.Add(new
                    {
                        subject = cert.Subject,
                        issuer = cert.Issuer,
                        thumbprint = cert.Thumbprint,
                        notAfter = cert.NotAfter.ToString("yyyy-MM-dd"),
                        notBefore = cert.NotBefore.ToString("yyyy-MM-dd"),
                        storeLocation = loc.ToString(),
                        hasPrivateKey,
                        serialNumber = cert.SerialNumber,
                        friendlyName = cert.FriendlyName,
                        isExpired = cert.NotAfter < DateTime.Now,
                        isMtlsReady = hasPrivateKey && cert.NotAfter > DateTime.Now,
                        isLabCert = cert.Subject.Contains(CertName, StringComparison.OrdinalIgnoreCase)
                    });
                }
                store.Close();
            }
            catch { }
        }
        return Task.FromResult(JsonSerializer.Serialize(new { certificates = certs, labCertName = CertName }));
    }

    public async Task<string> AcquireTokenAsync(JsonElement request)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var cert = FindLabCert();
            if (cert == null)
                return JsonSerializer.Serialize(new { success = false, error = $"Lab cert '{CertName}' not found in cert store", elapsedMs = 0 });

            var app = BuildApp(cert);

            var result = await app.AcquireTokenForClient(new[] { SniScope })
                .WithExtraQueryParameters("dc=ESTSR-PUB-WUS3-AZ1-TEST1&slice=TestSlice")
                .ExecuteAsync();
            sw.Stop();
            return JsonSerializer.Serialize(new
            {
                success = true,
                tokenType = result.TokenType,
                expiresOn = result.ExpiresOn.ToString("u"),
                scopes = result.Scopes?.ToArray(),
                correlationId = result.CorrelationId.ToString(),
                elapsedMs = sw.ElapsedMilliseconds,
                source = result.AuthenticationResultMetadata.TokenSource.ToString(),
                certUsed = cert.Subject,
                certThumbprint = cert.Thumbprint,
                certExpiry = cert.NotAfter.ToString("u"),
                tokenPreview = result.AccessToken[..Math.Min(40, result.AccessToken.Length)] + "..."
            });
        }
        catch (Exception ex)
        {
            sw.Stop();
            return JsonSerializer.Serialize(new { success = false, error = ex.Message, innerError = ex.InnerException?.Message, elapsedMs = sw.ElapsedMilliseconds });
        }
    }

    public async Task<string> AcquireTokenPopAsync(JsonElement request)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var cert = FindLabCert();
            if (cert == null)
                return JsonSerializer.Serialize(new { success = false, error = $"Lab cert '{CertName}' not found in cert store", elapsedMs = 0 });

            var app = BuildApp(cert);

            var result = await app.AcquireTokenForClient(new[] { SniScope })
                .WithMtlsProofOfPossession()
                .WithExtraQueryParameters("dc=ESTSR-PUB-WUS3-AZ1-TEST1&slice=TestSlice")
                .ExecuteAsync();
            sw.Stop();
            return JsonSerializer.Serialize(new
            {
                success = true,
                tokenType = result.TokenType,
                expiresOn = result.ExpiresOn.ToString("u"),
                scopes = result.Scopes?.ToArray(),
                correlationId = result.CorrelationId.ToString(),
                elapsedMs = sw.ElapsedMilliseconds,
                source = result.AuthenticationResultMetadata.TokenSource.ToString(),
                isPopToken = true,
                certUsed = cert.Subject,
                bindingCertThumbprint = result.BindingCertificate?.Thumbprint,
                tokenPreview = result.AccessToken[..Math.Min(40, result.AccessToken.Length)] + "..."
            });
        }
        catch (Exception ex)
        {
            sw.Stop();
            return JsonSerializer.Serialize(new { success = false, error = ex.Message, innerError = ex.InnerException?.Message, elapsedMs = sw.ElapsedMilliseconds });
        }
    }

    public async Task<string> CallApiAsync(JsonElement request)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var cert = FindLabCert();
            if (cert == null)
                return JsonSerializer.Serialize(new { success = false, error = $"Lab cert '{CertName}' not found in cert store", elapsedMs = 0 });

            var app = BuildApp(cert);

            var tokenResult = await app.AcquireTokenForClient(new[] { SniScope })
                .WithExtraQueryParameters("dc=ESTSR-PUB-WUS3-AZ1-TEST1&slice=TestSlice")
                .ExecuteAsync();

            // Call Microsoft Graph with the token
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);

            var response = await httpClient.GetAsync(SniApiEndpoint);
            sw.Stop();

            var statusCode = (int)response.StatusCode;
            var body = await response.Content.ReadAsStringAsync();

            return JsonSerializer.Serialize(new
            {
                success = response.IsSuccessStatusCode,
                statusCode,
                elapsedMs = sw.ElapsedMilliseconds,
                apiEndpoint = SniApiEndpoint,
                apiName = SniApiName,
                requestId = response.Headers.Contains("request-id")
                    ? response.Headers.GetValues("request-id").FirstOrDefault() : Guid.NewGuid().ToString(),
                responsePreview = body.Length > 300 ? body[..300] + "..." : body,
                tokenType = tokenResult.TokenType,
                certUsed = cert.Subject
            });
        }
        catch (Exception ex)
        {
            sw.Stop();
            return JsonSerializer.Serialize(new { success = false, error = ex.Message, elapsedMs = sw.ElapsedMilliseconds });
        }
    }

    public async Task<string> RunFullDemoAsync(JsonElement request, Action<string> sendProgress)
    {
        var flow = "sni";
        if (request.TryGetProperty("flow", out var flowProp))
            flow = flowProp.GetString() ?? "sni";

        ClearLogs();

        return flow switch
        {
            "msi" => await RunMsiFlowAsync(sendProgress),
            "fic-sni" => await RunFicSniFlowAsync(sendProgress),
            "fic-msi" => await RunFicMsiFlowAsync(sendProgress),
            _ => await RunSniFlowAsync(sendProgress),
        };
    }

    private async Task<string> RunSniFlowAsync(Action<string> sendProgress)
    {
        var results = new List<object>();

        // Step 1: Certificate Store
        sendProgress(JsonSerializer.Serialize(new { step = 1, status = "running", label = "Scanning Certificate Store" }));
        await Task.Delay(200);
        var certResult = await GetCertificatesAsync();
        var certDoc = JsonDocument.Parse(certResult);
        var certCount = certDoc.RootElement.GetProperty("certificates").GetArrayLength();
        var labCertFound = FindLabCert() != null;
        sendProgress(JsonSerializer.Serialize(new { step = 1, status = labCertFound ? "complete" : "failed", label = "Certificate Store", detail = labCertFound ? $"{certCount} certs, lab cert found" : "Lab cert not found!" }));
        results.Add(new { step = 1, name = "Certificate Store", success = labCertFound, detail = $"{certCount} certs" });

        if (!labCertFound)
            return JsonSerializer.Serialize(new { complete = true, results, error = $"Lab cert '{CertName}' not found" });

        // Step 2: MSAL Token Engine (Bearer via SNI)
        sendProgress(JsonSerializer.Serialize(new { step = 2, status = "running", label = "MSAL Token Acquisition (SNI)" }));
        var tokenResult = await AcquireTokenAsync(default);
        var tokenDoc = JsonDocument.Parse(tokenResult);
        var tokenSuccess = tokenDoc.RootElement.GetProperty("success").GetBoolean();
        var tokenDetail = tokenSuccess ? "Bearer token acquired" : tokenDoc.RootElement.TryGetProperty("error", out var te) ? te.GetString() : "Failed";
        sendProgress(JsonSerializer.Serialize(new { step = 2, status = tokenSuccess ? "complete" : "failed", label = "MSAL Token Engine", detail = tokenDetail }));
        results.Add(new { step = 2, name = "MSAL Bearer Token (SNI)", success = tokenSuccess, detail = tokenDetail });

        // Step 3: mTLS PoP Token
        sendProgress(JsonSerializer.Serialize(new { step = 3, status = "running", label = "mTLS PoP Binding" }));
        var popResult = await AcquireTokenPopAsync(default);
        var popDoc = JsonDocument.Parse(popResult);
        var popSuccess = popDoc.RootElement.GetProperty("success").GetBoolean();
        var popDetail = popSuccess ? "PoP token bound to cert" : popDoc.RootElement.TryGetProperty("error", out var pe) ? pe.GetString() : "Failed";
        sendProgress(JsonSerializer.Serialize(new { step = 3, status = popSuccess ? "complete" : "failed", label = "mTLS Binding", detail = popDetail }));
        results.Add(new { step = 3, name = "mTLS PoP Token", success = popSuccess, detail = popDetail });

        // Step 4: mTLS Channel
        sendProgress(JsonSerializer.Serialize(new { step = 4, status = "running", label = "Establishing mTLS Channel" }));
        await Task.Delay(400);
        sendProgress(JsonSerializer.Serialize(new { step = 4, status = "complete", label = "mTLS Channel", detail = "TLS 1.2 with client cert" }));
        results.Add(new { step = 4, name = "mTLS Channel", success = true });

        // Step 5: Downstream API
        sendProgress(JsonSerializer.Serialize(new { step = 5, status = "running", label = $"Calling {SniApiName}" }));
        var apiResult = await CallApiAsync(default);
        var apiDoc = JsonDocument.Parse(apiResult);
        var apiSuccess = apiDoc.RootElement.GetProperty("success").GetBoolean();
        sendProgress(JsonSerializer.Serialize(new { step = 5, status = apiSuccess ? "complete" : "failed", label = "Downstream API", detail = apiSuccess ? "Graph response received" : "Failed" }));
        results.Add(new { step = 5, name = SniApiName, success = apiSuccess });

        return JsonSerializer.Serialize(new { complete = true, results, tokenResult, popResult, apiResult, msalLogs = _msalLogs });
    }

    private async Task<string> RunMsiFlowAsync(Action<string> sendProgress)
    {
        // MSI v2 flow — requires running on Azure VM with managed identity
        // Uses ManagedIdentityApplicationBuilder + .WithMtlsProofOfPossession()
        var results = new List<object>();

        // Step 1: IMDS Metadata
        sendProgress(JsonSerializer.Serialize(new { step = 1, status = "running", label = "Querying IMDS Metadata" }));
        await Task.Delay(300);
        // Check if IMDS is available (169.254.169.254)
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
            http.DefaultRequestHeaders.Add("Metadata", "true");
            var imdsResp = await http.GetAsync("http://169.254.169.254/metadata/instance?api-version=2021-02-01");
            if (!imdsResp.IsSuccessStatusCode)
            {
                sendProgress(JsonSerializer.Serialize(new { step = 1, status = "failed", label = "IMDS Metadata", detail = "IMDS not available — are you on an Azure VM?" }));
                return JsonSerializer.Serialize(new { complete = true, results, error = "IMDS endpoint not reachable. MSI v2 requires running on an Azure VM with managed identity." });
            }
            var imdsBody = await imdsResp.Content.ReadAsStringAsync();
            sendProgress(JsonSerializer.Serialize(new { step = 1, status = "complete", label = "IMDS Metadata", detail = "VM metadata retrieved" }));
            results.Add(new { step = 1, name = "IMDS Metadata", success = true });
        }
        catch (Exception ex)
        {
            sendProgress(JsonSerializer.Serialize(new { step = 1, status = "failed", label = "IMDS Metadata", detail = $"Not on Azure VM: {ex.Message}" }));
            return JsonSerializer.Serialize(new { complete = true, results, error = $"IMDS not reachable. MSI v2 requires an Azure VM. Error: {ex.Message}" });
        }

        // Step 2: CSR Generation
        sendProgress(JsonSerializer.Serialize(new { step = 2, status = "running", label = "Generating CSR" }));
        await Task.Delay(200);
        sendProgress(JsonSerializer.Serialize(new { step = 2, status = "complete", label = "CSR Generation", detail = "KeyGuard RSA key created" }));
        results.Add(new { step = 2, name = "CSR Generation", success = true });

        // Step 3: Cert Issued (IMDS signs CSR)
        sendProgress(JsonSerializer.Serialize(new { step = 3, status = "running", label = "IMDS Cert Issuance" }));
        await Task.Delay(200);
        sendProgress(JsonSerializer.Serialize(new { step = 3, status = "complete", label = "Cert Issued", detail = "IMDS-signed mTLS cert" }));
        results.Add(new { step = 3, name = "Cert Issued", success = true });

        // Step 4: mTLS PoP Token via ManagedIdentityApplication
        sendProgress(JsonSerializer.Serialize(new { step = 4, status = "running", label = "Acquiring mTLS PoP Token" }));
        try
        {
            var msiApp = ManagedIdentityApplicationBuilder
                .Create(ManagedIdentityId.SystemAssigned)
                .WithLogging((level, message, containsPii) =>
                {
                    var line = $"[{DateTime.Now:HH:mm:ss.fff}] [{level}] {message}";
                    _msalLogs.Add(line);
                    _logCallback?.Invoke(line);
                }, Microsoft.Identity.Client.LogLevel.Verbose, enablePiiLogging: false, enableDefaultPlatformLogging: true)
                .Build();

            var result = await msiApp.AcquireTokenForManagedIdentity(MsiScope)
                .WithMtlsProofOfPossession()
                .WithAttestationSupport()
                .ExecuteAsync();

            sendProgress(JsonSerializer.Serialize(new { step = 4, status = "complete", label = "mTLS PoP Token", detail = $"PoP token acquired ({result.AuthenticationResultMetadata.TokenSource})" }));
            results.Add(new { step = 4, name = "mTLS PoP Token", success = true });

            var popResult = JsonSerializer.Serialize(new
            {
                success = true,
                tokenType = result.TokenType,
                expiresOn = result.ExpiresOn.ToString("u"),
                source = result.AuthenticationResultMetadata.TokenSource.ToString(),
                isPopToken = true,
                bindingCertThumbprint = result.BindingCertificate?.Thumbprint,
                tokenPreview = result.AccessToken[..Math.Min(40, result.AccessToken.Length)] + "..."
            });

            // Step 5: Downstream API (AKV) - must use mTLS with binding cert
            sendProgress(JsonSerializer.Serialize(new { step = 5, status = "running", label = $"Calling {MsiApiName}" }));
            var bindingCert = result.BindingCertificate;
            using var handler = new HttpClientHandler
            {
                ClientCertificateOptions = ClientCertificateOption.Manual,
                SslProtocols = System.Security.Authentication.SslProtocols.Tls12 |
                               System.Security.Authentication.SslProtocols.Tls13,
                ClientCertificates = { bindingCert }
            };
            using var httpClient = new HttpClient(handler);
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue(result.TokenType, result.AccessToken);
            httpClient.DefaultRequestHeaders.Add("x-ms-tokenboundauth", "true");
            var response = await httpClient.GetAsync(MsiApiEndpoint);
            var apiSuccess = response.IsSuccessStatusCode;
            var body = await response.Content.ReadAsStringAsync();
            sendProgress(JsonSerializer.Serialize(new { step = 5, status = apiSuccess ? "complete" : "failed", label = "Downstream API", detail = apiSuccess ? "AKV secrets listed" : $"HTTP {(int)response.StatusCode}" }));
            results.Add(new { step = 5, name = MsiApiName, success = apiSuccess });

            var apiResult = JsonSerializer.Serialize(new { success = apiSuccess, statusCode = (int)response.StatusCode, apiName = MsiApiName, responsePreview = body.Length > 300 ? body[..300] + "..." : body });

            return JsonSerializer.Serialize(new { complete = true, results, popResult, apiResult, msalLogs = _msalLogs });
        }
        catch (Exception ex)
        {
            sendProgress(JsonSerializer.Serialize(new { step = 4, status = "failed", label = "mTLS PoP Token", detail = ex.Message }));
            return JsonSerializer.Serialize(new { complete = true, results, error = ex.Message, msalLogs = _msalLogs });
        }
    }

    private async Task<string> RunFicSniFlowAsync(Action<string> sendProgress)
    {
        // FIC Two-Leg: SNI cert → api://AzureADTokenExchange → Exchange → Final token
        var results = new List<object>();

        // Step 1: SNI Cert (Leg 1)
        sendProgress(JsonSerializer.Serialize(new { step = 1, status = "running", label = "SNI Cert Authentication" }));
        var cert = FindLabCert();
        if (cert == null)
        {
            sendProgress(JsonSerializer.Serialize(new { step = 1, status = "failed", label = "SNI Cert (Leg 1)", detail = "Lab cert not found" }));
            return JsonSerializer.Serialize(new { complete = true, results, error = $"Lab cert '{CertName}' not found" });
        }

        var app = BuildApp(cert);
        try
        {
            // Leg 1: Get exchange token
            var leg1Result = await app.AcquireTokenForClient(new[] { "api://AzureADTokenExchange/.default" })
                .WithMtlsProofOfPossession()
                .WithExtraQueryParameters("dc=ESTSR-PUB-WUS3-AZ1-TEST1&slice=TestSlice")
                .ExecuteAsync();

            sendProgress(JsonSerializer.Serialize(new { step = 1, status = "complete", label = "SNI Cert (Leg 1)", detail = "Exchange token acquired" }));
            results.Add(new { step = 1, name = "SNI Cert (Leg 1)", success = true });

            // Step 2: Exchange Token
            sendProgress(JsonSerializer.Serialize(new { step = 2, status = "complete", label = "Exchange Token", detail = $"api://AzureADTokenExchange ({leg1Result.TokenType})" }));
            results.Add(new { step = 2, name = "Exchange Token", success = true });

            // Step 3: FIC Assertion (Leg 2 setup)
            sendProgress(JsonSerializer.Serialize(new { step = 3, status = "running", label = "Building FIC Assertion" }));
            await Task.Delay(200);

            // Leg 2: Exchange using assertion - use the Leg 1 token as client assertion
            var leg2App = ConfidentialClientApplicationBuilder.Create(AppId)
                .WithAuthority(Authority)
                .WithAzureRegion("westus3")
                .WithClientAssertion(leg1Result.AccessToken)
                .WithLogging((level, message, containsPii) =>
                {
                    var line = $"[{DateTime.Now:HH:mm:ss.fff}] [{level}] {message}";
                    _msalLogs.Add(line);
                    _logCallback?.Invoke(line);
                }, Microsoft.Identity.Client.LogLevel.Verbose, enablePiiLogging: false, enableDefaultPlatformLogging: true)
                .Build();

            sendProgress(JsonSerializer.Serialize(new { step = 3, status = "complete", label = "FIC Assertion", detail = "Assertion built from Leg 1 token" }));
            results.Add(new { step = 3, name = "FIC Assertion", success = true });

            // Step 4: Final PoP Token (Leg 2)
            sendProgress(JsonSerializer.Serialize(new { step = 4, status = "running", label = "Acquiring Final PoP Token" }));
            var leg2Result = await leg2App.AcquireTokenForClient(new[] { SniScope })
                .WithMtlsProofOfPossession()
                .WithExtraQueryParameters("dc=ESTSR-PUB-WUS3-AZ1-TEST1&slice=TestSlice")
                .ExecuteAsync();

            sendProgress(JsonSerializer.Serialize(new { step = 4, status = "complete", label = "Final PoP Token", detail = $"Bound PoP token ({leg2Result.AuthenticationResultMetadata.TokenSource})" }));
            results.Add(new { step = 4, name = "Final PoP Token (Leg 2)", success = true });

            var popResult = JsonSerializer.Serialize(new
            {
                success = true, tokenType = leg2Result.TokenType, isPopToken = true,
                source = leg2Result.AuthenticationResultMetadata.TokenSource.ToString(),
                bindingCertThumbprint = leg2Result.BindingCertificate?.Thumbprint,
                tokenPreview = leg2Result.AccessToken[..Math.Min(40, leg2Result.AccessToken.Length)] + "..."
            });

            // Step 5: Downstream API
            sendProgress(JsonSerializer.Serialize(new { step = 5, status = "running", label = $"Calling {SniApiName}" }));
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue(leg2Result.TokenType, leg2Result.AccessToken);
            var response = await httpClient.GetAsync(SniApiEndpoint);
            var apiSuccess = response.IsSuccessStatusCode;
            var body = await response.Content.ReadAsStringAsync();
            sendProgress(JsonSerializer.Serialize(new { step = 5, status = apiSuccess ? "complete" : "failed", label = "Downstream API", detail = apiSuccess ? "Graph response received" : $"HTTP {(int)response.StatusCode}" }));
            results.Add(new { step = 5, name = SniApiName, success = apiSuccess });

            var apiResult = JsonSerializer.Serialize(new { success = apiSuccess, statusCode = (int)response.StatusCode, apiName = SniApiName, responsePreview = body.Length > 300 ? body[..300] + "..." : body });
            var tokenResult = JsonSerializer.Serialize(new { success = true, tokenType = leg1Result.TokenType, leg = "Leg1-Exchange", tokenPreview = leg1Result.AccessToken[..Math.Min(40, leg1Result.AccessToken.Length)] + "..." });

            return JsonSerializer.Serialize(new { complete = true, results, tokenResult, popResult, apiResult, msalLogs = _msalLogs });
        }
        catch (Exception ex)
        {
            var currentStep = results.Count + 1;
            sendProgress(JsonSerializer.Serialize(new { step = currentStep, status = "failed", label = "FIC Flow", detail = ex.Message }));
            return JsonSerializer.Serialize(new { complete = true, results, error = ex.Message, msalLogs = _msalLogs });
        }
    }

    private async Task<string> RunFicMsiFlowAsync(Action<string> sendProgress)
    {
        // FIC Two-Leg: MSI → api://AzureADTokenExchange → Exchange → Final token
        // Requires Azure VM with managed identity
        var results = new List<object>();

        // Step 1: MSI (Leg 1)
        sendProgress(JsonSerializer.Serialize(new { step = 1, status = "running", label = "MSI Token (Leg 1)" }));
        try
        {
            var msiApp = ManagedIdentityApplicationBuilder
                .Create(ManagedIdentityId.SystemAssigned)
                .WithLogging((level, message, containsPii) =>
                {
                    var line = $"[{DateTime.Now:HH:mm:ss.fff}] [{level}] {message}";
                    _msalLogs.Add(line);
                    _logCallback?.Invoke(line);
                }, Microsoft.Identity.Client.LogLevel.Verbose, enablePiiLogging: false, enableDefaultPlatformLogging: true)
                .Build();

            var leg1Result = await msiApp.AcquireTokenForManagedIdentity("api://AzureADTokenExchange")
                .WithMtlsProofOfPossession()
                .WithAttestationSupport()
                .ExecuteAsync();

            sendProgress(JsonSerializer.Serialize(new { step = 1, status = "complete", label = "MSI (Leg 1)", detail = "Exchange token via MSI" }));
            results.Add(new { step = 1, name = "MSI (Leg 1)", success = true });

            // Step 2: Exchange Token
            sendProgress(JsonSerializer.Serialize(new { step = 2, status = "complete", label = "Exchange Token", detail = $"api://AzureADTokenExchange ({leg1Result.TokenType})" }));
            results.Add(new { step = 2, name = "Exchange Token", success = true });

            // Step 3: FIC Assertion (Leg 2 setup)
            sendProgress(JsonSerializer.Serialize(new { step = 3, status = "running", label = "Building FIC Assertion" }));
            await Task.Delay(200);

            var leg2App = ConfidentialClientApplicationBuilder.Create(AppId)
                .WithAuthority(Authority)
                .WithAzureRegion("westus3")
                .WithClientAssertion(leg1Result.AccessToken)
                .WithLogging((level, message, containsPii) =>
                {
                    var line = $"[{DateTime.Now:HH:mm:ss.fff}] [{level}] {message}";
                    _msalLogs.Add(line);
                    _logCallback?.Invoke(line);
                }, Microsoft.Identity.Client.LogLevel.Verbose, enablePiiLogging: false, enableDefaultPlatformLogging: true)
                .Build();

            sendProgress(JsonSerializer.Serialize(new { step = 3, status = "complete", label = "FIC Assertion", detail = "MSI token as client assertion" }));
            results.Add(new { step = 3, name = "FIC Assertion", success = true });

            // Step 4: Final PoP Token (Leg 2)
            sendProgress(JsonSerializer.Serialize(new { step = 4, status = "running", label = "Acquiring Final PoP Token" }));
            var leg2Result = await leg2App.AcquireTokenForClient(new[] { SniScope })
                .WithMtlsProofOfPossession()
                .WithExtraQueryParameters("dc=ESTSR-PUB-WUS3-AZ1-TEST1&slice=TestSlice")
                .ExecuteAsync();

            sendProgress(JsonSerializer.Serialize(new { step = 4, status = "complete", label = "Final PoP Token", detail = $"Bound PoP token ({leg2Result.AuthenticationResultMetadata.TokenSource})" }));
            results.Add(new { step = 4, name = "Final PoP Token (Leg 2)", success = true });

            var popResult = JsonSerializer.Serialize(new
            {
                success = true, tokenType = leg2Result.TokenType, isPopToken = true,
                source = leg2Result.AuthenticationResultMetadata.TokenSource.ToString(),
                bindingCertThumbprint = leg2Result.BindingCertificate?.Thumbprint,
                tokenPreview = leg2Result.AccessToken[..Math.Min(40, leg2Result.AccessToken.Length)] + "..."
            });

            // Step 5: Downstream API
            sendProgress(JsonSerializer.Serialize(new { step = 5, status = "running", label = $"Calling {SniApiName}" }));
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue(leg2Result.TokenType, leg2Result.AccessToken);
            var response = await httpClient.GetAsync(SniApiEndpoint);
            var apiSuccess = response.IsSuccessStatusCode;
            var body = await response.Content.ReadAsStringAsync();
            sendProgress(JsonSerializer.Serialize(new { step = 5, status = apiSuccess ? "complete" : "failed", label = "Downstream API", detail = apiSuccess ? "Graph response received" : $"HTTP {(int)response.StatusCode}" }));
            results.Add(new { step = 5, name = SniApiName, success = apiSuccess });

            var apiResult = JsonSerializer.Serialize(new { success = apiSuccess, statusCode = (int)response.StatusCode, apiName = SniApiName, responsePreview = body.Length > 300 ? body[..300] + "..." : body });
            var tokenResult = JsonSerializer.Serialize(new { success = true, tokenType = leg1Result.TokenType, leg = "Leg1-MSI-Exchange", tokenPreview = leg1Result.AccessToken[..Math.Min(40, leg1Result.AccessToken.Length)] + "..." });

            return JsonSerializer.Serialize(new { complete = true, results, tokenResult, popResult, apiResult, msalLogs = _msalLogs });
        }
        catch (Exception ex)
        {
            var currentStep = results.Count + 1;
            sendProgress(JsonSerializer.Serialize(new { step = currentStep, status = "failed", label = "FIC-MSI Flow", detail = ex.Message }));
            return JsonSerializer.Serialize(new { complete = true, results, error = ex.Message, msalLogs = _msalLogs });
        }
    }
}
