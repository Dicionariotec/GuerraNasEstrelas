const gravity = 1;
const sKey = 83;
const dKey = 68;
const wKey = 87;
const aKey = 65;
const xKey = 88;
const spaceKey = 32;

let spaceship;

let waves;
let currentWave = 0;

let cam;

let shotSoundEffect;
let explosionSoundEffect;
let backMusic;
let gameFont;

let gameState = 1; // 1: start, 2: gameplay, 3: gameover, 4: gameclear

function preload() {
    backMusic = loadSound('resources/lost_in_space.mp3');
    shotSoundEffect = loadSound('resources/shot.wav');
    explosionSoundEffect = loadSound('resources/explosion.wav');
    gameFont = loadFont('resources/font.ttf');
    startScreenAsset = loadImage('resources/start_screen.png');
}

function setup() {
    let canvas = createCanvas(700, 600, WEBGL);
    canvas.parent('sketch-holder');
    cam = createCamera();

    textFont(gameFont);
    textSize(width / 4);
    textAlign(CENTER, CENTER);

    spaceship = new Spaceship(new Nitro(2));
    waves = getWaves();
}

function draw() {
    background(40, 40, 40);

    if (gameState == 1) {
        gameStartScreen();
        return;
    }

    if (gameState == 2) {
        gamePlayScreen();
        return;
    }

    if (gameState == 3) {
        gameOverScreen();
        return;
    }

    if (gameState >= 4) {
        gameClearScreen();
        return;
    }
}

function getWaves() {
    return [
        new Wave(1),
        new Wave(3),
        new Wave(5),
        new Wave(2, 2, 30, 3),
        new Wave(3, 2, 30, 3),
        new Wave(2, 3, 30, 3, 3, 200),
        new Wave(2, 4, 40, 4, 4, 200)
    ]
}

function gameClearScreen() {
    gameOverScreen('Game Clear');
}

function gameStartScreen() {
    image(startScreenAsset, width / 2 * -1, height / 2 * -1, width, height);
    textSize(25);
    text('Aperte espaço para iniciar o jogo', 0, height / 4);

    if (keyIsDown(spaceKey)) {
        gameState = 2;
    }
}

function gamePlayScreen() {
    if (!backMusic.isPlaying()) {
        backMusic.play();
    }

    if (!waves[currentWave].isReadyToGo()) {
        let currentWaveDisplay = currentWave + 1;
        textSize(width / 5);
        let wave = currentWave < waves.length -1 ? 'Wave ' + currentWaveDisplay : 'Last Wave';
        text(wave, 0, -50);
        spaceship.display(false);
        return;
    }

    if (waves[currentWave].isNotOver()) {
        spaceship.nitro.display();
        spaceship.display();
        return;
    }

    if (waves[currentWave + 1]) {
        currentWave++;
        return;
    }

    gameState = 4;
}

function gameOverScreen(finalText = 'Game Over') {
    if (backMusic.isPlaying()) {
        backMusic.stop();
    }

    image(startScreenAsset, width / 2 * -1, height / 2 * -1, width, height);
    textSize(25);
    text('Aperte espaço para reiniciar o jogo', 0, height / 4);

    textSize(30);
    text(finalText, 0, height / 4 * -1);
    
    let resetGame = function() {
        currentWave = 0;
        spaceship = new Spaceship(new Nitro(2));
        waves = getWaves();
    };

    if (keyIsDown(spaceKey)) {
        gameState = 2;
        resetGame();
    }
}

function convertRange(oldMin, oldMax, newMin, newMax, currentValue) {
    let oldRange = oldMax - oldMin;
    if (oldRange == 0) {
        return newMin;
    }

    let newRange = newMax - newMin;
    return ((currentValue - oldMin) * newRange / oldRange) + newMin;
}

// Nitro
class Nitro {
    constructor(power) {
        this.bWidth = 20;
        this.bHeight = 100;
        this.power = power;
        this.left = 3;
        this.isActived = false;
    }

    active() {
        if (this.left > 0) {
            this.isActived = true;
            this.left -= 0.1;
            return this.power;
        }

        return 0;
    }

    reload() {
        if (this.left < 3 && !this.isActived) {
            this.left += 0.1;
        }
    }

    display() {
        push();
        normalMaterial();
        fill(0, 191, 255, 60);
        stroke(0, 191, 255);
        let yOrigin = convertRange(3, 0, height / 2 - this.bHeight - 10, (height / 2 - this.bHeight - 10) + this.bHeight, this.left);
        let currentHeight = convertRange(0, 3, 0, this.bHeight, this.left);
        rect(width / 2 - (this.bWidth * 2) - 20, yOrigin, this.bWidth, currentHeight);
        pop();
    }
}

class Hp {
    constructor(max) {
        this.bWidth = 20;
        this.bHeight = 100;
        this.left = max;
        this.max = max;
    }

    decrease(damage) {
        if (this.left > 0) {
            this.left -= damage;
        }

        if (this.left < 1) {
            gameState = 3;
        }
    }

    display() {
        push();
        normalMaterial();
        fill(255, 0, 0, 60);
        stroke(255, 0, 0);
        let yOrigin = convertRange(this.max, 0, height / 2 - this.bHeight - 10, (height / 2 - this.bHeight - 10) + this.bHeight, this.left);
        let currentHeight = convertRange(0, this.max, 0, this.bHeight, this.left);
        rect(width / 2 - this.bWidth - 10, yOrigin, this.bWidth, currentHeight);
        pop();
    }
}

// Spaceship
class Spaceship {
    constructor(nitro) {
        this.hp = new Hp(100);
        this.bHeigth = -50;
        this.bWidth = 20;
        this.position = createVector(0, height / 2 + this.bHeigth);
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        this.accelerationPower = 0.2;

        // Nitro
        this.nitro = nitro;

        // Bullets
        this.bullets = [];
        this.currentTime = 0;
        this.timeBetweenShots = 12;
    }

    keyboardCommands() {
        // Nitro
        let accelerationPower = this.accelerationPower;

        if (keyIsDown(aKey)) {
            accelerationPower += this.nitro.active();
        } else {
            this.nitro.isActived = false;
        }

        // Keys Pressed
        if (keyIsDown(UP_ARROW)) {
            this.acceleration.y -= accelerationPower;
        }

        if (keyIsDown(DOWN_ARROW)) {
            this.acceleration.y += accelerationPower;
        }

        if (keyIsDown(RIGHT_ARROW)) {
            this.acceleration.x += accelerationPower;
        }

        if (keyIsDown(LEFT_ARROW)) {
            this.acceleration.x -= accelerationPower;
        }

        // Brake
        if (keyIsDown(sKey)) {
            this.brake();
        }
    }

    brake() {
        let verticalBrakingVelocity = this.calculateBrakingVelocity(this.velocity.y);
        let horizontalBrakingVelocity = this.calculateBrakingVelocity(this.velocity.x);

        if (this.velocity.y > 0) {
            this.velocity.y -= verticalBrakingVelocity;
        } else if (this.velocity.y < 0) {
            this.velocity.y += verticalBrakingVelocity;
        }

        if (this.velocity.x > 0) {
            this.velocity.x -= horizontalBrakingVelocity;
        } else if (this.velocity.x < 0) {
            this.velocity.x += horizontalBrakingVelocity;
        }
    }

    drive() {
        this.keyboardCommands();

        // Add Acceleration
        this.velocity.add(this.acceleration);

        // Affect position with velocity
        this.position.add(this.velocity);
        this.acceleration.mult(0);

        // Reload Nitro
        if (!this.nitro.isActived) {
            this.nitro.reload();
        }

        // Edges
        if (this.position.x < (width / 2 - this.bWidth) * -1) {
            this.position.x = (width / 2 - this.bWidth) * -1;
            this.velocity.mult(0);
        }

        if (this.position.x > width / 2 - this.bWidth) {
            this.position.x = width / 2 - this.bWidth;
            this.velocity.mult(0);
        }

        if (this.position.y < (height / 2 + this.bHeigth) * -1) {
            this.position.y = (height / 2 + this.bHeigth) * -1;
            this.velocity.mult(0);
        }

        if (this.position.y > height / 2 + this.bHeigth) {
            this.position.y = height / 2 + this.bHeigth;
            this.velocity.mult(0);
        }
    }

    calculateBrakingVelocity(velocity) {
        let coefficient = 0.1;
        return velocity * velocity / 2 * coefficient * gravity;
    }

    // Trigger Gun
    fire() {
        if (keyIsDown(spaceKey)) {
            if (this.currentTime <= 0) {
                shotSound();
                this.bullets.push(new Bullet(this.position, 5, 5));
                this.currentTime = this.timeBetweenShots;
            }
        }

        this.currentTime--;

        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].display();

            if (this.bullets[i].position.y < height / 2 * -1) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Enemies Collision
            for (let j = 0; j < waves[currentWave].enemies.length; j++) {
                let enemy = waves[currentWave].enemies[j];

                if (this.bullets[i].position.y <= enemy.position.y + enemy.bHeight && this.bullets[i].position.y + (this.bullets[i].size / 2) >= enemy.position.y &&
                    this.bullets[i].position.x <= enemy.position.x + enemy.bWidth && this.bullets[i].position.x + (this.bullets[i].size / 2) >= enemy.position.x - enemy.bWidth) {
                    waves[currentWave].enemies[j].setDamage(this.bullets[i].damage);
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    display(enableControls = true) {
        if (enableControls) {
            this.drive();
            this.fire();
            this.hp.display();
        }

        push();
        translate(this.position.x, this.position.y);
        cone(this.bWidth, this.bHeigth);
        pop();
    }
}

// Bullet
class Bullet {
    constructor(position, size, speed, isPlayer = true, routeVec = null) {
        this.position = position.copy();
        this.size = size;
        this.speed = speed;
        this.isPlayer = isPlayer;
        this.damage = 5;
        this.routeVec = routeVec;
    }

    travelThroughSpace() {
        if (this.isPlayer) {
            this.position.sub(createVector(0, this.speed));
            return;
        }

        if (!this.routeVec) {
            this.position.add(createVector(0, this.speed));
            return;
        }

        this.position.add(this.routeVec);
    }

    display() {
        this.travelThroughSpace();

        push();
        normalMaterial();
        fill(255, 255, 0);
        translate(this.position.x, this.position.y - this.size);
        sphere(this.size);
        pop();
    }
}

// Enemy
class Enemy {
    constructor(hp, position, level, bWidth, bHeight, speed, shotSpeed = 2) {
        this.hp = hp;
        this.position = position;
        this.bWidth = bWidth;
        this.bHeight = bHeight;
        this.speed = speed;
        this.shotSpeed = shotSpeed;
        this.level = level;

        this.bullets = [];
        this.currentTime = 0;
        this.timeBetweenShots = 40;

        this.angleY = 0;
    }

    setDamage(damage) {
        if (this.hp > 0) {
            this.hp -= damage
        }
    }

    fire() {
        if (this.currentTime <= 0) {
            switch (this.level) {
                case 2:
                    this.bullets.push(
                        new Bullet(this.position, 5, this.shotSpeed, false, createVector(0.25 * -1, this.shotSpeed)),
                        new Bullet(this.position, 5, this.shotSpeed, false, createVector(0.25, this.shotSpeed))
                    );
                    break;
                case 3:
                    this.bullets.push(
                        new Bullet(this.position, 5, this.shotSpeed, false, createVector(0.75 * -1, this.shotSpeed)),
                        new Bullet(this.position, 5, this.shotSpeed, false, createVector(0, this.shotSpeed)),
                        new Bullet(this.position, 5, this.shotSpeed, false, createVector(0.75, this.shotSpeed)),
                    );
                    break;
                case 4:
                    this.bullets.push(
                        new Bullet(this.position, 6, this.shotSpeed, false, createVector(-2, this.shotSpeed)),
                        new Bullet(this.position, 6, this.shotSpeed, false, createVector(-1, this.shotSpeed)),
                        new Bullet(this.position, 6, this.shotSpeed, false, createVector(0, this.shotSpeed)),
                        new Bullet(this.position, 6, this.shotSpeed, false, createVector(1, this.shotSpeed)),
                        new Bullet(this.position, 6, this.shotSpeed, false, createVector(2, this.shotSpeed)),
                    );
                    break;
                default:
                    this.bullets.push(
                        new Bullet(this.position, 5, 3, false)
                    );
            }
            this.currentTime = this.timeBetweenShots;
        }

        this.currentTime--;
    }

    displayBullets() {
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].display();

            // Collision
            if (this.bullets[i].position.y + (this.bullets[i].size / 2) >= spaceship.position.y && this.bullets[i].position.y <= spaceship.position.y + (spaceship.bHeigth * -1) &&
                this.bullets[i].position.x + (this.bullets[i].size / 2) >= spaceship.position.x - spaceship.bWidth && this.bullets[i].position.x <= spaceship.position.x + spaceship.bWidth) {
                spaceship.hp.decrease(this.bullets[i].damage);
                this.bullets.splice(i, 1);
                continue;
            }

            // Edges
            if (this.bullets[i].position.y > height / 2) {
                this.bullets.splice(i, 1);
            }
        }
    }

    loseControl() {
        this.angleY += 0.1;
    }

    display() {
        this.displayBullets();

        push();
        if (this.angleY > 0) {
            rotateY(this.angleY);
        }
        translate(this.position.x, this.position.y, this.position.z);
        cone(this.bWidth, this.bHeigth);
        pop();
    }
}

class Wave {
    constructor(enemiesCount, level = 1, size = 30, speed = 2, shotSpeed = 2, hp = 100) {
        this.enemiesCount = enemiesCount;
        this.startVerticalCoordinate = height / 4 * -1;
        this.isReady = false;

        let enemies = [];
        for (let i = 0; i < enemiesCount; i++) {
            let enemyPos = createVector(this.getInitialXPos(i, enemiesCount), height / 2 * -1, i * 10);
            enemies.push(
                new Enemy(hp, enemyPos, level, size, size, speed, shotSpeed)
            );
        }

        this.enemies = enemies;
    }

    // Arithmetic progression
    getInitialXPos(currentIndex, count) {
        // To adjust offset from polygon size I put width / 1.5
        let initialX = (width / 1.5) / (count - 1);
        // In webgl, position x = 0 means center, that's why I put width / 3
        return (initialX * currentIndex) - width / 3;
    }

    isReadyToGo() {
        if (!this.isReady) {
            for (let i = 0; i < this.enemies.length; i++) {
                if (this.enemies[i].position.y >= this.startVerticalCoordinate) {
                    this.isReady = true;
                    break;
                } else {
                    this.enemies[i].position.y += 0.5;
                }

                this.enemies[i].display();
            }
        }

        return this.isReady;
    }

    isNotOver() {
        if (this.enemies.length <= 0) {
            return false;
        }

        this.enemyStrategies();

        return true;
    }

    enemyStrategies() {
        // TODO: Other strategies
        for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].display();

            // If Destroyed
            if (this.enemies[i].hp <= 0) {
                this.enemies[i].loseControl();
                if (this.enemies[i].bullets.length <= 0) {
                    explosionSoundEffect.play();
                    this.enemies.splice(i, 1);
                }
                continue;
            }

            this.enemies[i].position.x += this.enemies[i].speed;

            // Edges
            if (this.enemies[i].position.x > width / 2 - this.enemies[i].bWidth || this.enemies[i].position.x < (width / 2 - this.enemies[i].bWidth) * -1) {
                this.enemies[i].speed *= -1;
            }

            this.enemies[i].fire();
        }
    }
}

function shotSound() {
    shotSoundEffect.play();
    shotSoundEffect.setVolume(0.1);
}