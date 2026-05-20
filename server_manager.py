import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import subprocess
import threading
import os
import sys
import webbrowser
import time
import signal

class ServerManager:
    def __init__(self, root):
        self.root = root
        self.root.title("Data Agents - Server Manager")
        self.root.geometry("700x550")
        self.root.configure(bg="#1e1e1e")
        
        self.backend_process = None
        self.frontend_process = None
        
        self.setup_styles()
        self.create_widgets()
        
        # Set protocol for closing window
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def setup_styles(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Colors
        self.bg_color = "#1e1e1e"
        self.fg_color = "#ffffff"
        self.accent_color = "#3d5afe"
        self.success_color = "#00c853"
        self.error_color = "#ff1744"
        self.card_bg = "#2d2d2d"
        
        self.style.configure("TFrame", background=self.bg_color)
        self.style.configure("Card.TFrame", background=self.card_bg)
        
        self.style.configure("Main.TLabel", 
                           background=self.bg_color, 
                           foreground=self.fg_color,
                           font=("Sans", 16, "bold"))
        
        self.style.configure("Status.TLabel", 
                           background=self.card_bg, 
                           foreground=self.fg_color,
                           font=("Sans", 10))
        
        self.style.configure("TButton", 
                           font=("Sans", 10, "bold"),
                           borderwidth=0,
                           focuscolor=self.accent_color)
        
        # Custom button styles
        self.style.map("Start.TButton",
                      background=[('active', "#2979ff"), ('!disabled', self.accent_color)],
                      foreground=[('!disabled', 'white')])
        
        self.style.map("Stop.TButton",
                      background=[('active', "#ff5252"), ('!disabled', self.error_color)],
                      foreground=[('!disabled', 'white')])

        self.style.map("Action.TButton",
                      background=[('active', "#424242"), ('!disabled', "#333333")],
                      foreground=[('!disabled', 'white')])

    def create_widgets(self):
        # Header
        header_frame = tk.Frame(self.root, bg=self.bg_color, pady=20)
        header_frame.pack(fill=tk.X)
        
        title_label = tk.Label(header_frame, text="DATA AGENTS CONTROL PANEL", 
                             font=("Sans", 20, "bold"), bg=self.bg_color, fg=self.fg_color)
        title_label.pack()
        
        subtitle_label = tk.Label(header_frame, text="Manage server processes", 
                                font=("Sans", 10), bg=self.bg_color, fg="#aaaaaa")
        subtitle_label.pack()

        # Main Container
        main_container = tk.Frame(self.root, bg=self.bg_color, padx=30, pady=10)
        main_container.pack(fill=tk.BOTH, expand=True)

        # Control Panel (Top)
        controls_frame = tk.Frame(main_container, bg=self.bg_color)
        controls_frame.pack(fill=tk.X, pady=(0, 20))

        self.start_all_btn = tk.Button(controls_frame, text="START ALL SERVERS", 
                                    command=self.start_all,
                                    bg=self.success_color, fg="white", 
                                    font=("Sans", 12, "bold"), 
                                    padx=20, pady=10, borderwidth=0, cursor="hand2")
        self.start_all_btn.pack(side=tk.LEFT, padx=(0, 10))

        self.stop_all_btn = tk.Button(controls_frame, text="STOP ALL SERVERS", 
                                   command=self.stop_all,
                                   bg=self.error_color, fg="white", 
                                   font=("Sans", 12, "bold"), 
                                   padx=20, pady=10, borderwidth=0, cursor="hand2")
        self.stop_all_btn.pack(side=tk.LEFT)

        self.open_game_btn = tk.Button(controls_frame, text="OPEN GAME", 
                                    command=lambda: webbrowser.open("http://127.0.0.1:5500"),
                                    bg="#00bcd4", fg="white", 
                                    font=("Sans", 12, "bold"), 
                                    padx=20, pady=10, borderwidth=0, cursor="hand2")
        self.open_game_btn.pack(side=tk.RIGHT)

        # Server Status Cards
        cards_frame = tk.Frame(main_container, bg=self.bg_color)
        cards_frame.pack(fill=tk.X, pady=10)

        # Backend Card
        self.backend_card = self.create_server_card(cards_frame, "Backend Server", "Port 5000 (Flask)", self.toggle_backend)
        self.backend_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))
        
        # Frontend Card
        self.frontend_card = self.create_server_card(cards_frame, "Frontend Server", "Port 5500 (HTTP)", self.toggle_frontend)
        self.frontend_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(10, 0))

        # Console Output
        tk.Label(main_container, text="SYSTEM LOGS", font=("Segoe UI", 10, "bold"), 
                 bg=self.bg_color, fg="#888888").pack(anchor=tk.W, pady=(20, 5))
        
        self.console = scrolledtext.ScrolledText(main_container, height=10, 
                                               bg="#121212", fg="#00ff41", 
                                               font=("Consolas", 9),
                                               insertbackground="white",
                                               borderwidth=0)
        self.console.pack(fill=tk.BOTH, expand=True)
        self.log("System Manager initialized. Ready to launch.")

    def create_server_card(self, parent, name, subtitle, toggle_cmd):
        card = tk.Frame(parent, bg=self.card_bg, padx=15, pady=15, highlightthickness=1, highlightbackground="#444444")
        
        tk.Label(card, text=name, font=("Sans", 12, "bold"), bg=self.card_bg, fg=self.fg_color).pack(anchor=tk.W)
        tk.Label(card, text=subtitle, font=("Sans", 9), bg=self.card_bg, fg="#aaaaaa").pack(anchor=tk.W, pady=(0, 10))
        
        status_frame = tk.Frame(card, bg=self.card_bg)
        status_frame.pack(anchor=tk.W, fill=tk.X, pady=5)
        
        status_dot = tk.Canvas(status_frame, width=12, height=12, bg=self.card_bg, highlightthickness=0)
        status_dot.pack(side=tk.LEFT)
        dot_id = status_dot.create_oval(2, 2, 10, 10, fill=self.error_color, outline="")
        
        status_label = tk.Label(status_frame, text="OFFLINE", font=("Sans", 9, "bold"), 
                               bg=self.card_bg, fg=self.error_color)
        status_label.pack(side=tk.LEFT, padx=5)
        
        btn = tk.Button(card, text="START SERVER", command=toggle_cmd,
                       bg=self.accent_color, fg="white", 
                       font=("Sans", 9, "bold"), 
                       padx=10, pady=5, borderwidth=0, cursor="hand2")
        btn.pack(fill=tk.X, pady=(10, 0))
        
        # Store references
        if "Backend" in name:
            self.backend_status_dot = status_dot
            self.backend_dot_id = dot_id
            self.backend_status_label = status_label
            self.backend_toggle_btn = btn
        else:
            self.frontend_status_dot = status_dot
            self.frontend_dot_id = dot_id
            self.frontend_status_label = status_label
            self.frontend_toggle_btn = btn
            
        return card

    def log(self, message):
        self.console.insert(tk.END, f"[{time.strftime('%H:%M:%S')}] {message}\n")
        self.console.see(tk.END)

    def update_status(self, server_type, is_running):
        color = self.success_color if is_running else self.error_color
        text = "RUNNING" if is_running else "OFFLINE"
        btn_text = "STOP SERVER" if is_running else "START SERVER"
        btn_bg = self.error_color if is_running else self.accent_color
        
        if server_type == "backend":
            self.backend_status_dot.itemconfig(self.backend_dot_id, fill=color)
            self.backend_status_label.config(text=text, fg=color)
            self.backend_toggle_btn.config(text=btn_text, bg=btn_bg)
        else:
            self.frontend_status_dot.itemconfig(self.frontend_dot_id, fill=color)
            self.frontend_status_label.config(text=text, fg=color)
            self.frontend_toggle_btn.config(text=btn_text, bg=btn_bg)

    def start_backend(self):
        if self.backend_process:
            return

        def run():
            try:
                self.log("Starting Backend server...")
                # Use absolute path of the script
                base_dir = os.path.dirname(os.path.abspath(__file__))
                cwd = os.path.join(base_dir, "backend")
                
                # Check for Linux/Mac venv path first, then Windows
                if os.name == 'nt':
                    python_exe = os.path.join(cwd, "venv", "Scripts", "python.exe")
                else:
                    python_exe = os.path.join(cwd, "venv", "bin", "python")
                
                if not os.path.exists(python_exe):
                    python_exe = sys.executable
                
                kwargs = {}
                if os.name == 'nt':
                    kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
                else:
                    kwargs['preexec_fn'] = os.setsid

                self.backend_process = subprocess.Popen(
                    [python_exe, "app.py"],
                    cwd=cwd,
                    **kwargs
                )
                self.update_status("backend", True)
                self.log(f"Backend server is running on http://127.0.0.1:5000 (CWD: {cwd})")
                
                self.backend_process.wait()
                self.log("Backend server stopped.")
                self.backend_process = None
                self.update_status("backend", False)
            except Exception as e:
                self.log(f"Error starting backend: {e}")
                self.backend_process = None
                self.update_status("backend", False)

        threading.Thread(target=run, daemon=True).start()

    def start_frontend(self):
        if self.frontend_process:
            return

        def run():
            try:
                self.log("Starting Frontend server...")
                # Use absolute path of the script
                cwd = os.path.dirname(os.path.abspath(__file__))
                
                kwargs = {}
                if os.name == 'nt':
                    kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
                else:
                    kwargs['preexec_fn'] = os.setsid

                self.frontend_process = subprocess.Popen(
                    [sys.executable, "-m", "http.server", "5500"],
                    cwd=cwd,
                    **kwargs
                )
                self.update_status("frontend", True)
                self.log(f"Frontend server is running on http://127.0.0.1:5500 (CWD: {cwd})")
                
                self.frontend_process.wait()
                self.log("Frontend server stopped.")
                self.frontend_process = None
                self.update_status("frontend", False)
            except Exception as e:
                self.log(f"Error starting frontend: {e}")
                self.frontend_process = None
                self.update_status("frontend", False)

        threading.Thread(target=run, daemon=True).start()

    def stop_backend(self):
        if self.backend_process:
            self.log("Stopping Backend server...")
            if os.name == 'nt':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.backend_process.pid)])
            else:
                try:
                    os.killpg(os.getpgid(self.backend_process.pid), signal.SIGTERM)
                except ProcessLookupError:
                    pass
            self.backend_process = None
            self.update_status("backend", False)

    def stop_frontend(self):
        if self.frontend_process:
            self.log("Stopping Frontend server...")
            if os.name == 'nt':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.frontend_process.pid)])
            else:
                try:
                    os.killpg(os.getpgid(self.frontend_process.pid), signal.SIGTERM)
                except ProcessLookupError:
                    pass
            self.frontend_process = None
            self.update_status("frontend", False)

    def toggle_backend(self):
        if self.backend_process:
            self.stop_backend()
        else:
            self.start_backend()

    def toggle_frontend(self):
        if self.frontend_process:
            self.stop_frontend()
        else:
            self.start_frontend()

    def start_all(self):
        self.start_backend()
        # Small delay to let backend initialize
        self.root.after(1000, self.start_frontend)

    def stop_all(self):
        self.stop_backend()
        self.stop_frontend()

    def on_closing(self):
        if self.backend_process or self.frontend_process:
            if messagebox.askokcancel("Quit", "Server(lar) hala çalışıyor. Kapatmak istiyor musunuz?"):
                self.stop_all()
                self.root.destroy()
        else:
            self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    # Simple check for scaling on high DPI displays
    if os.name == 'nt':
        try:
            from ctypes import windll
            windll.shcore.SetProcessDpiAwareness(1)
        except:
            pass
    
    app = ServerManager(root)
    root.mainloop()
