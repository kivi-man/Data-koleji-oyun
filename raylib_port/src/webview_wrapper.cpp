#define WEBVIEW_HEADER
#include "webview_official.h"
#include "webview_wrapper.h"
#include <windows.h>
#include <iostream>

static webview::webview* g_webview = nullptr;
static bool g_closeRequested = false;
static HWND g_hWebView = NULL;

// Helper to find the webview child window
BOOL CALLBACK EnumChildProc(HWND hwnd, LPARAM lParam) {
    char className[256];
    GetClassNameA(hwnd, className, 256);
    // WebView2 class is generally "Chrome_WidgetWin_0" or "Chrome_WidgetWin_1"
    if (std::string(className).find("Chrome_WidgetWin") != std::string::npos ||
        std::string(className).find("WebView") != std::string::npos) {
        *((HWND*)lParam) = hwnd;
        return FALSE; // Stop enum
    }
    return TRUE;
}

namespace WebViewOS {
    void Initialize(void* windowHandle, const std::string& url) {
        if (!g_webview) {
            try {
                g_webview = new webview::webview(true, windowHandle);
                
                g_webview->bind("close_os_window", [](std::string req) -> std::string {
                    g_closeRequested = true;
                    return "";
                });
                
                g_webview->navigate(url);
                
                // Find HWND of the child
                HWND parent = (HWND)windowHandle;
                EnumChildWindows(parent, EnumChildProc, (LPARAM)&g_hWebView);
                
            } catch (const std::exception& e) {
                std::cerr << "WebView Initialization failed: " << e.what() << std::endl;
                if (g_webview) { delete g_webview; g_webview = nullptr; }
            }
        } else {
            g_webview->navigate(url);
            Show();
        }
    }

    void Navigate(const std::string& url) {
        if (g_webview) g_webview->navigate(url);
    }

    void Show() {
        if (g_hWebView) ShowWindow(g_hWebView, SW_SHOW);
    }

    void Hide() {
        if (g_hWebView) ShowWindow(g_hWebView, SW_HIDE);
    }

    void Terminate() {
        if (g_webview) {
            delete g_webview;
            g_webview = nullptr;
            g_hWebView = NULL;
        }
    }

    void Resize(int width, int height) {
        if (g_webview) {
            g_webview->set_size(width, height, WEBVIEW_HINT_NONE);
        }
    }

    bool IsCloseRequested() { return g_closeRequested; }
    void ClearCloseRequested() { g_closeRequested = false; }
}
