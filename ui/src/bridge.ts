// Bridge for communicating with C# backend via WebView2
export interface BackendResponse {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

type ProgressCallback = (data: any) => void;
let progressCallback: ProgressCallback | null = null;
let responseResolve: ((value: any) => void) | null = null;

// Called by C# when a response is ready
(window as any).__trustflow_response = (data: any) => {
  if (responseResolve) {
    responseResolve(data);
    responseResolve = null;
  }
};

// Called by C# for progress updates during demo run
(window as any).__trustflow_progress = (data: any) => {
  if (progressCallback) {
    progressCallback(data);
  }
};

export function setProgressCallback(cb: ProgressCallback | null) {
  progressCallback = cb;
}

export async function callBackend(action: string, payload: any = {}): Promise<any> {
  // Check if running in WebView2
  if ((window as any).chrome?.webview) {
    return new Promise((resolve) => {
      responseResolve = resolve;
      (window as any).chrome.webview.postMessage(JSON.stringify({ action, ...payload }));
      // Timeout fallback
      setTimeout(() => {
        if (responseResolve === resolve) {
          responseResolve = null;
          resolve({ success: false, error: 'Timeout waiting for backend response' });
        }
      }, 30000);
    });
  } else {
    // Demo mode - return simulated data
    return simulateBackend(action);
  }
}

function simulateBackend(action: string): any {
  switch (action) {
    case 'getEnvironment':
      return {
        tenantId: '72f988bf-86f1-41af-91ab-2d7cd011db47',
        uamiClientId: '6325cd32-9911-41f3-819c-416cdf9104e7',
        vaultUri: 'https://tokenbinding.vault.azure.net/',
        secretName: 'test-secret',
        scope: 'https://vault.azure.net/.default',
        machineName: 'DEMO-VM',
        osVersion: 'Microsoft Windows NT 10.0.26100.0',
        region: 'WestUS2'
      };
    case 'getCertificates':
      return {
        certificates: [
          { subject: 'CN=demo-client.microsoft.com', issuer: 'CN=Microsoft Azure TLS Issuing CA 06', thumbprint: 'A1B2C3D4E5F6...', notAfter: '2026-12-31', storeLocation: 'CurrentUser', hasPrivateKey: true, isMtlsReady: true, isExpired: false },
          { subject: 'CN=platform-identity', issuer: 'CN=Azure MSI CA', thumbprint: 'F6E5D4C3B2A1...', notAfter: '2027-06-15', storeLocation: 'LocalMachine', hasPrivateKey: true, isMtlsReady: true, isExpired: false }
        ]
      };
    case 'acquireToken':
      return { success: true, tokenType: 'Bearer', expiresOn: '2026-06-20T10:41:28Z', elapsedMs: 234, source: 'IdentityProvider', correlationId: 'abc-123-def', tokenPreview: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...' };
    case 'acquireTokenPop':
      return { success: true, tokenType: 'pop', expiresOn: '2026-06-20T10:41:28Z', elapsedMs: 312, source: 'IdentityProvider', correlationId: 'xyz-456-uvw', isPopToken: true, tokenPreview: 'eyJ0eXAiOiJwb3AiLCJhbGciOiJSUzI1NiIs...' };
    case 'callApi':
      return { success: true, statusCode: 200, secretName: 'test-secret', secretValueLength: 24, elapsedMs: 187, vaultUri: 'https://tokenbinding.vault.azure.net/', requestId: 'req-789-ghi' };
    default:
      return { error: 'Unknown action' };
  }
}
