/**
 * Demo Scene Manager
 * Handles specific logic, dialogues, and events for the Demo Mode.
 * This extends or complements the main SceneManager.
 */

class DemoSceneManager {
    constructor(game, sceneManager) {
        this.game = game;
        this.sceneManager = sceneManager;
        this.dialogues = this.defineDialogues();
    }

    defineDialogues() {
        return {
            intro_speech: [
                ['Emre Hoca', 'Hadi bakalım gençler, yerleşiyoruz. Ayakta dikilmek yok.'],
                ['Emre Hoca', 'Saf Saf hareket yapma, geç yerine.']
            ],
            // Add other demo-specific dialogues here if needed
            demo_class_intro: [
                ['Emre Hoca', 'Herkes yerine geçtiyse başlayalım.'],
                ['Emre Hoca', 'Bugün basit bir devre kuracağız.'],
                ['Emre Hoca', 'Önünüzdeki bilgisayarı açın ve VoltSim uygulamasını bulun.']
            ]
        };
    }

    // You can move demo-specific logic here from SceneManager if it gets too large
    // For now, we will just export the dialogues to be used by SceneManager
}
