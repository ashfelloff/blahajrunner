const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set fixed canvas size
canvas.width = 800;
canvas.height = 600;

// Game states
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    EXPERIMENTAL_MENU: 'experimental_menu',
    EXPERIMENTAL_PLAYING: 'experimental_playing',
    EXPERIMENTAL_GAME_OVER: 'experimental_gameover'
};

// Load images
const blahajImage = new Image();
const backgroundImage = new Image();
blahajImage.src = 'assets/sprites/blahaj.png';
backgroundImage.src = 'assets/sprites/background.png';

// Game variables
let currentGameState = GameState.MENU;
let score = 0;
let highScore = localStorage.getItem('blahajHighScore') || 0;
let pipes = [];

// Blåhaj object
const blahaj = {
    x: 150,
    y: canvas.height / 2,
    width: 120,
    height: 80,
    gravity: 0.5,
    velocity: 0,
    jump: -10
};

// Update the background constants
const BG_WIDTH = backgroundImage.width || canvas.width;  // Use actual image width
const EXTRA_BG_SPACE = 2;  // Small overlap to prevent seams

// Update background initialization
const backgrounds = [
    { x: 0, speed: 2 },
    { x: BG_WIDTH - EXTRA_BG_SPACE, speed: 2 },  // Slight overlap
    { x: (BG_WIDTH * 2) - (EXTRA_BG_SPACE * 2), speed: 2 }  // Third background for smoother transition
];

// Game constants
const PIPE_WIDTH = 80;
const PIPE_GAP = 200;
const PIPE_SPACING = 300;
const PIPE_SPEED = 3;

// Load custom font
const fontPath = 'assets/fonts/font.ttf';
const customFont = new FontFace('GameFont', `url(${fontPath})`);

// Base settings (same for both modes initially)
const BASE_SETTINGS = {
    gravity: 0.5,
    jump: -10,
    pipeSpeed: 3,
    pipeGap: 200,
    pipeSpacing: 300
};

// Experimental controls (multipliers start at 1)
const EXPERIMENTAL_CONTROLS = {
    speedMultiplier: 1.0,
    gravityMultiplier: 1.0,
    movingPipesEnabled: false
};

// Make sure these values persist through state changes
let currentSpeedMultiplier = 1.0;
let currentGravityMultiplier = 1.0;
let movingPipesEnabled = false;

// Add handleSpaceKey function
function handleSpaceKey() {
    switch(currentGameState) {
        case GameState.MENU:
            currentGameState = GameState.PLAYING;
            resetGame(false);
            break;
        case GameState.PLAYING:
            handleJump();
            break;
        case GameState.GAME_OVER:
            currentGameState = GameState.MENU;
            break;
        case GameState.EXPERIMENTAL_MENU:
            currentGameState = GameState.EXPERIMENTAL_PLAYING;
            resetGame(true);
            break;
        case GameState.EXPERIMENTAL_PLAYING:
            handleJump();
            break;
        case GameState.EXPERIMENTAL_GAME_OVER:
            currentGameState = GameState.EXPERIMENTAL_MENU;
            break;
    }
}

// Update key listeners
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            handleSpaceKey();
            break;
        case 'KeyE':
            if (currentGameState === GameState.MENU) {
                currentGameState = GameState.EXPERIMENTAL_MENU;
            }
            break;
        case 'KeyP':
            alert('Known Issues:\n\n' + 
                  '1. Background seam visible during scrolling\n' +
                  '2. Object detection is goofy\n' +
                  '3. Pipes don\'t render properly\n\n' +
                  'Go to ashwath.ch to report any other issues');
            break;
        case 'KeyS':
            if (currentGameState === GameState.EXPERIMENTAL_MENU) {
                currentSpeedMultiplier = Math.min(3.0, currentSpeedMultiplier + 0.2);
                console.log('Speed set to:', currentSpeedMultiplier);
            }
            break;
        case 'KeyG':
            if (currentGameState === GameState.EXPERIMENTAL_MENU) {
                currentGravityMultiplier = Math.min(3.0, currentGravityMultiplier + 0.2);
                console.log('Gravity set to:', currentGravityMultiplier);
            }
            break;
        case 'KeyM':
            if (currentGameState === GameState.EXPERIMENTAL_MENU) {
                movingPipesEnabled = !movingPipesEnabled;
            }
            break;
        case 'KeyN':
            if (currentGameState === GameState.EXPERIMENTAL_MENU || 
                currentGameState === GameState.EXPERIMENTAL_PLAYING) {
                currentGameState = GameState.MENU;
                resetExperimentalValues();
            }
            break;
    }
});

function resetGame(experimental) {
    pipes = [];
    score = 0;
    blahaj.y = canvas.height / 2;
    blahaj.velocity = 0;
    
    if (experimental) {
        EXPERIMENTAL_CONTROLS.speedMultiplier = 1.0;
        EXPERIMENTAL_CONTROLS.gravityMultiplier = 1.0;
        EXPERIMENTAL_CONTROLS.movingPipesEnabled = false;
    }
    
    createPipe();
}

function createPipe() {
    const minHeight = 100;
    const maxHeight = canvas.height - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: topHeight + PIPE_GAP,
        passed: false,
        originalTopHeight: topHeight,
        moveTimer: 0
    });
}

function checkCollision(pipe) {
    return (blahaj.x + blahaj.width * 0.7 > pipe.x &&
            blahaj.x + blahaj.width * 0.3 < pipe.x + PIPE_WIDTH &&
            (blahaj.y + blahaj.height * 0.3 < pipe.topHeight || 
             blahaj.y + blahaj.height * 0.7 > pipe.bottomY));
}

function updateBackground() {
    backgrounds.forEach(bg => {
        bg.x -= bg.speed;
        // Reset position with overlap when background goes off screen
        if (bg.x <= -BG_WIDTH) {
            // Find the rightmost background
            const rightmostX = Math.max(...backgrounds.map(b => b.x));
            bg.x = rightmostX + BG_WIDTH - EXTRA_BG_SPACE;
        }
    });
}

// Add a function to create a gradient overlay
function drawBackgroundBlur() {
    // Create a subtle gradient on the edges
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(135, 206, 235, 0.2)');    // Sky blue with 20% opacity
    gradient.addColorStop(0.1, 'rgba(135, 206, 235, 0)');    // Transparent
    gradient.addColorStop(0.9, 'rgba(135, 206, 235, 0)');    // Transparent
    gradient.addColorStop(1, 'rgba(135, 206, 235, 0.2)');    // Sky blue with 20% opacity
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Update the drawBackground function
function drawBackground() {
    // Draw the scrolling backgrounds with slight overlap
    backgrounds.forEach(bg => {
        ctx.drawImage(backgroundImage, 
            0, 0,                    // Source x, y
            backgroundImage.width, backgroundImage.height,  // Source width, height
            bg.x, 0,                 // Destination x, y
            BG_WIDTH, canvas.height  // Destination width, height
        );
    });
    
    // Add the blur effect
    drawBackgroundBlur();
}

function drawBlurOverlay() {
    // Create gradients for the seams
    backgrounds.forEach(bg => {
        // Create gradient for right edge of each background
        const rightSeam = ctx.createLinearGradient(bg.x + BG_WIDTH - 50, 0, bg.x + BG_WIDTH + 50, 0);
        rightSeam.addColorStop(0, 'rgba(135, 206, 235, 0)');      // Transparent
        rightSeam.addColorStop(0.5, 'rgba(135, 206, 235, 0.3)');  // Semi-transparent at seam
        rightSeam.addColorStop(1, 'rgba(135, 206, 235, 0)');      // Transparent
        
        ctx.fillStyle = rightSeam;
        ctx.fillRect(bg.x + BG_WIDTH - 50, 0, 100, canvas.height);
    });
}

function update() {
    if (currentGameState !== GameState.PLAYING && 
        currentGameState !== GameState.EXPERIMENTAL_PLAYING) return;

    const isExperimental = currentGameState === GameState.EXPERIMENTAL_PLAYING;
    
    // Apply gravity with multiplier
    if (isExperimental) {
        blahaj.velocity += BASE_SETTINGS.gravity * currentGravityMultiplier;
    } else {
        blahaj.velocity += BASE_SETTINGS.gravity;
    }
    blahaj.y += blahaj.velocity;

    // Update pipes with speed multiplier
    const pipeSpeed = isExperimental ? 
        BASE_SETTINGS.pipeSpeed * currentSpeedMultiplier : 
        BASE_SETTINGS.pipeSpeed;

    pipes.forEach(pipe => {
        // Horizontal movement
        pipe.x -= pipeSpeed;
        
        // Vertical movement for moving pipes
        if (isExperimental && movingPipesEnabled) {
            pipe.moveTimer += 0.02;
            // 80 pixels up and down movement
            const verticalOffset = Math.sin(pipe.moveTimer) * 80;
            
            // Move both top and bottom of pipe
            pipe.topHeight = pipe.originalTopHeight + verticalOffset;
            pipe.bottomY = pipe.topHeight + PIPE_GAP;
        }

        if (!pipe.passed && pipe.x + PIPE_WIDTH < blahaj.x) {
            pipe.passed = true;
            score++;
        }
    });

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    // Create new pipes
    if (pipes.length === 0 || canvas.width - pipes[pipes.length - 1].x >= PIPE_SPACING) {
        createPipe();
    }

    // Check collisions
    if (blahaj.y < 0 || blahaj.y + blahaj.height > canvas.height || 
        pipes.some(pipe => checkCollision(pipe))) {
        currentGameState = isExperimental ? 
            GameState.EXPERIMENTAL_GAME_OVER : GameState.GAME_OVER;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('blahajHighScore', highScore);
        }
    }
}

function drawMenu() {
    drawBackground();
    updateBackground();

    // Info texts at the very top
    ctx.font = '14px GameFont';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    
    ctx.strokeText('PRESS P TO VIEW KNOWN ISSUES', canvas.width / 2, 20);
    ctx.fillText('PRESS P TO VIEW KNOWN ISSUES', canvas.width / 2, 20);
    
    ctx.strokeText('PRESS E FOR EXPERIMENTAL MODE', canvas.width / 2, 40);
    ctx.fillText('PRESS E FOR EXPERIMENTAL MODE', canvas.width / 2, 40);

    // Title
    ctx.font = '72px GameFont';
    ctx.lineWidth = 8;
    ctx.strokeText('BLAHAJ RUNNER', canvas.width / 2, 150);
    ctx.fillText('BLAHAJ RUNNER', canvas.width / 2, 150);

    // Start instruction
    ctx.font = '36px GameFont';
    ctx.lineWidth = 4;
    ctx.strokeText('PRESS SPACE TO START', canvas.width / 2, 250);
    ctx.fillText('PRESS SPACE TO START', canvas.width / 2, 250);

    // Draw static Blåhaj
    ctx.drawImage(blahajImage, 
        canvas.width / 2 - blahaj.width / 2,
        canvas.height / 2,
        blahaj.width,
        blahaj.height
    );

    // Credit and high score at bottom
    ctx.font = '24px GameFont';
    ctx.lineWidth = 3;
    
    // by ashfelloff
    ctx.strokeText('by ashfelloff', canvas.width / 2, canvas.height - 100);
    ctx.fillText('by ashfelloff', canvas.width / 2, canvas.height - 100);
    
    // High score
    ctx.strokeText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height - 50);
    ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height - 50);
}

function drawGame() {
    drawBackground();
    updateBackground();

    // Draw pipes - same for both modes
    ctx.fillStyle = 'green';
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, canvas.height - pipe.bottomY);
    });

    // Draw Blåhaj
    ctx.save();
    ctx.translate(blahaj.x + blahaj.width / 2, blahaj.y + blahaj.height / 2);
    ctx.rotate(blahaj.velocity * 0.02);
    ctx.drawImage(blahajImage, 
        -blahaj.width / 2, 
        -blahaj.height / 2, 
        blahaj.width, 
        blahaj.height
    );
    ctx.restore();

    // Draw score
    ctx.font = '48px GameFont';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.strokeText(score.toString(), canvas.width / 2, 50);
    ctx.fillText(score.toString(), canvas.width / 2, 50);

    // Draw multipliers if in experimental mode
    if (currentGameState === GameState.EXPERIMENTAL_PLAYING) {
        ctx.font = '18px GameFont';
        ctx.lineWidth = 2;
        ctx.textAlign = 'left';
        
        ctx.strokeText(`SPEED: ${currentSpeedMultiplier.toFixed(1)}x`, 10, 30);
        ctx.fillText(`SPEED: ${currentSpeedMultiplier.toFixed(1)}x`, 10, 30);
        
        ctx.strokeText(`GRAVITY: ${currentGravityMultiplier.toFixed(1)}x`, 10, 60);
        ctx.fillText(`GRAVITY: ${currentGravityMultiplier.toFixed(1)}x`, 10, 60);
        
        if (movingPipesEnabled) {
            ctx.strokeText('MOVING PIPES: ON', 10, 90);
            ctx.fillText('MOVING PIPES: ON', 10, 90);
        }
    }
}

function drawGameOver() {
    drawGame();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '48px GameFont';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.textAlign = 'center';
    
    ctx.strokeText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = '36px GameFont';
    ctx.strokeText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText(`SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.font = '24px GameFont';
    ctx.strokeText('PRESS SPACE TO RETURN TO MENU', canvas.width / 2, canvas.height / 2 + 70);
    ctx.fillText('PRESS SPACE TO RETURN TO MENU', canvas.width / 2, canvas.height / 2 + 70);
}

function drawExperimentalMenu() {
    drawBackground();
    updateBackground();

    // Info text at top
    ctx.font = '14px GameFont';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    
    ctx.strokeText('PRESS P TO VIEW KNOWN ISSUES', canvas.width / 2, 20);
    ctx.fillText('PRESS P TO VIEW KNOWN ISSUES', canvas.width / 2, 20);
    
    ctx.strokeText('PRESS N FOR NORMAL MODE', canvas.width / 2, 40);
    ctx.fillText('PRESS N FOR NORMAL MODE', canvas.width / 2, 40);

    // Title
    ctx.font = '72px GameFont';
    ctx.lineWidth = 8;
    ctx.strokeText('EXPERIMENTAL MODE', canvas.width / 2, 150);
    ctx.fillText('EXPERIMENTAL MODE', canvas.width / 2, 150);

    // Start instruction (same as normal menu)
    ctx.font = '36px GameFont';
    ctx.lineWidth = 4;
    ctx.strokeText('PRESS SPACE TO START', canvas.width / 2, 250);
    ctx.fillText('PRESS SPACE TO START', canvas.width / 2, 250);

    // Controls and current settings (moved up)
    ctx.font = '24px GameFont';
    ctx.lineWidth = 3;
    const settings = [
        `SPEED: ${currentSpeedMultiplier.toFixed(1)}x (PRESS S)`,
        `GRAVITY: ${currentGravityMultiplier.toFixed(1)}x (PRESS G)`,
        `MOVING PIPES: ${movingPipesEnabled ? 'ON' : 'OFF'} (PRESS M)`
    ];
    
    settings.forEach((setting, index) => {
        ctx.strokeText(setting, canvas.width / 2, canvas.height - 250 + (index * 40));
        ctx.fillText(setting, canvas.width / 2, canvas.height - 250 + (index * 40));
    });

    // Credit and high score at bottom (unchanged)
    ctx.font = '24px GameFont';
    ctx.lineWidth = 3;
    
    // by ashfelloff
    ctx.strokeText('by ashfelloff', canvas.width / 2, canvas.height - 100);
    ctx.fillText('by ashfelloff', canvas.width / 2, canvas.height - 100);
    
    // High score
    ctx.strokeText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height - 50);
    ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height - 50);
}

// Update jump handler
function handleJump() {
    if (currentGameState === GameState.EXPERIMENTAL_PLAYING) {
        blahaj.velocity = BASE_SETTINGS.jump * currentGravityMultiplier;
    } else {
        blahaj.velocity = BASE_SETTINGS.jump;
    }
}

// Reset experimental values when returning to normal mode
function resetExperimentalValues() {
    currentSpeedMultiplier = 1.0;
    currentGravityMultiplier = 1.0;
    movingPipesEnabled = false;
}

// Update game loop
function gameLoop() {
    if (currentGameState === GameState.PLAYING || 
        currentGameState === GameState.EXPERIMENTAL_PLAYING) {
        update();
    }
    
    switch(currentGameState) {
        case GameState.MENU:
            drawMenu();
            break;
        case GameState.PLAYING:
            drawGame();
            break;
        case GameState.GAME_OVER:
            drawGameOver();
            break;
        case GameState.EXPERIMENTAL_MENU:
            drawExperimentalMenu();
            break;
        case GameState.EXPERIMENTAL_PLAYING:
            drawGame();
            break;
        case GameState.EXPERIMENTAL_GAME_OVER:
            drawGameOver();
            break;
    }
    
    requestAnimationFrame(gameLoop);
}

// Wait for both images and font to load
Promise.all([
    new Promise(resolve => blahajImage.onload = resolve),
    new Promise(resolve => backgroundImage.onload = resolve),
    customFont.load().then(function(loadedFont) {
        document.fonts.add(loadedFont);
    })
]).then(() => {
    console.log('All assets loaded, starting game');
    gameLoop();
}).catch(error => {
    console.error('Error loading assets:', error);
});
