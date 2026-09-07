import './style.css';
import { Game } from './core/Game';
const canvas = document.getElementById('game') as HTMLCanvasElement;
let game: Game | undefined;
try {
  game = new Game(canvas);
  void game.init().catch(showError);
} catch (error) { showError(error); }
function showError(error: unknown) {
  console.error(error);
  const status = document.getElementById('loading');
  if (status) { status.textContent = 'Spiel konnte nicht starten. Bitte WebGL aktivieren und die Seite neu laden. Details stehen in der Browser-Konsole.'; status.classList.add('error'); }
}
if (import.meta.hot) import.meta.hot.dispose(() => game?.dispose());
