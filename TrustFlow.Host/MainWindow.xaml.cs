using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace TrustFlow.Host;

public partial class MainWindow : Window
{
    private readonly BackendService _backend = new();

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        _backend.SetLogCallback(SendMsalLog);
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        var env = await CoreWebView2Environment.CreateAsync(null, Path.GetTempPath());
        await webView.EnsureCoreWebView2Async(env);
        webView.CoreWebView2.WebMessageReceived += OnWebMessage;

        // Load the React app from the ui/dist folder
        var uiPath = Path.Combine(AppContext.BaseDirectory, "ui", "index.html");
        if (File.Exists(uiPath))
        {
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "trustflow.local", Path.Combine(AppContext.BaseDirectory, "ui"),
                CoreWebView2HostResourceAccessKind.Allow);
            webView.CoreWebView2.Navigate("https://trustflow.local/index.html");
        }
        else
        {
            // Dev mode - load from Vite dev server
            webView.CoreWebView2.Navigate("http://localhost:5173");
        }
    }

    private async void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var msg = e.TryGetWebMessageAsString();
            var doc = JsonDocument.Parse(msg);
            var action = doc.RootElement.GetProperty("action").GetString();
            var result = action switch
            {
                "getCertificates" => await _backend.GetCertificatesAsync(),
                "acquireToken" => await _backend.AcquireTokenAsync(doc.RootElement),
                "acquireTokenPop" => await _backend.AcquireTokenPopAsync(doc.RootElement),
                "callApi" => await _backend.CallApiAsync(doc.RootElement),
                "runFullDemo" => await _backend.RunFullDemoAsync(doc.RootElement, SendProgress),
                "getEnvironment" => _backend.GetEnvironment(),
                "getLogs" => JsonSerializer.Serialize(new { logs = _backend.GetLogs() }),
                _ => JsonSerializer.Serialize(new { error = $"Unknown action: {action}" })
            };
            await Dispatcher.InvokeAsync(async () =>
            {
                await webView.CoreWebView2.ExecuteScriptAsync(
                    $"window.__trustflow_response({result})");
            });
        }
        catch (Exception ex)
        {
            var err = JsonSerializer.Serialize(new { error = ex.Message });
            await Dispatcher.InvokeAsync(async () =>
            {
                await webView.CoreWebView2.ExecuteScriptAsync(
                    $"window.__trustflow_response({err})");
            });
        }
    }

    private async void SendProgress(string progressJson)
    {
        await Dispatcher.InvokeAsync(async () =>
        {
            await webView.CoreWebView2.ExecuteScriptAsync(
                $"window.__trustflow_progress({progressJson})");
        });
    }

    private async void SendMsalLog(string logLine)
    {
        var escaped = JsonSerializer.Serialize(logLine);
        await Dispatcher.InvokeAsync(async () =>
        {
            await webView.CoreWebView2.ExecuteScriptAsync(
                $"window.__trustflow_log({escaped})");
        });
    }
}