#pragma once
#include <string>

namespace WebViewOS {
    void Initialize(void* windowHandle, const std::string& url);
    void Navigate(const std::string& url);
    void Show();
    void Hide();
    void Terminate();
    void Resize(int width, int height); 
    bool IsCloseRequested();
    void ClearCloseRequested();
}
