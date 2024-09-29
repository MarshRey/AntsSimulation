const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Simulation Variables
let initialAnts = 1;  // Set the initial number of ants
let ants = [];
let nests = [{ x: canvas.width / 2, y: canvas.height / 2, size: 10, antCount: initialAnts, foodStored: 5 }];
let foodSources = [];
let pheromoneMarker = null;  // Single pheromone marker placed by the player
const maxFoodPiles = 10;
const antSpeed = 1;  // Slower speed
let score = 0;
let timer = 0;
let foodSpawnInterval = 5000;  // Initial interval for food spawning (5 seconds)
const maxNestSize = 10 * 8;  // Nest size capped at 8 times its initial size
zoom = 1;

// Classes for Pheromone and Ants
class PheromoneMarker {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    draw() {
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Ant {
    constructor(x, y, nest_x, nest_y) {
        this.x = x;
        this.y = y;
        this.hasFood = false;
        this.nest_x = nest_x;
        this.nest_y = nest_y;
        this.radius = 5;
        this.changeDirectionCountdown = Math.floor(Math.random() * 500) + 100;  // Countdown to change direction, reduced frequency
        this.currentDirection = { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 };
        this.lastFoodX = null;
        this.lastFoodY = null;
        this.lifeSpan = 120 * 60;  // 2 minutes in frames (assuming 60fps)
        this.foodDetectionRadius = 8 * this.radius;
    }

    moveTowards(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
            this.x += (dx / dist) * antSpeed;
            this.y += (dy / dist) * antSpeed;
        }
    }

    avoidCollision() {
        for (const otherAnt of ants) {
            if (otherAnt !== this) {
                const dx = otherAnt.x - this.x;
                const dy = otherAnt.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist < this.radius * 2) {
                    this.x -= dx / dist;
                    this.y -= dy / dist;
                }
            }
        }
    }

    wander() {
        this.changeDirectionCountdown -= 1;
        if (this.changeDirectionCountdown <= 0) {
            this.currentDirection = { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 };
            this.changeDirectionCountdown = Math.floor(Math.random() * 500) + 100;  // Reset countdown
        }

        this.x += this.currentDirection.dx * antSpeed;
        this.y += this.currentDirection.dy * antSpeed;
    }

    update() {
        this.avoidCollision();

        this.lifeSpan -= 1;
        if (this.lifeSpan <= 0) {
            this.die();
            return;
        }

        let foodNearby = null;
        for (const food of foodSources) {
            if (Math.hypot(this.x - food.x, this.y - food.y) < this.foodDetectionRadius) {
                foodNearby = food;
                break;
            }
        }

        if (this.hasFood) {
            this.moveTowards(this.nest_x, this.nest_y);
            if (Math.hypot(this.x - this.nest_x, this.y - this.nest_y) < nests[0].size) {
                this.hasFood = false;
                nests[0].foodStored += 1;
                score += 10;
            }
        } else if (foodNearby) {
            const dx = foodNearby.x - this.x;
            const dy = foodNearby.y - this.y;
            const distanceToFood = Math.hypot(dx, dy);
            const stopDistance = this.radius + foodNearby.size;
            if (distanceToFood > stopDistance) {
                this.moveTowards(foodNearby.x, foodNearby.y);
            } else {
                this.hasFood = true;
                this.lastFoodX = foodNearby.x;
                this.lastFoodY = foodNearby.y;
                foodNearby.size -= 1;
                if (foodNearby.size <= 0) {
                    foodSources = foodSources.filter(f => f !== foodNearby);
                }
            }
        } else {
            if (pheromoneMarker) {
                this.moveTowards(pheromoneMarker.x, pheromoneMarker.y);
            } else {
                this.wander();
            }
        }
    }

    die() {
        ants = ants.filter(a => a !== this);
        score -= 20;
        nests[0].antCount--;
    }

    draw() {
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.hasFood) {
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function initializeSimulation() {
    for (let i = 0; i < initialAnts; i++) {
        // print out the initial ants
        console.log("Initial Ants: ", initialAnts);
        ants.push(new Ant(nests[0].x, nests[0].y, nests[0].x, nests[0].y));
        // print out the ants coords
        console.log(nests[0].x, nests[0].y);
        console.log("Ants: ", ants);
    }

    for (let i = 0; i < 3; i++) {
        let randomX = Math.random() * (canvas.width - 100) + 50;
        let randomY = Math.random() * (canvas.height - 100) + 50;
        let foodSize = getRandomFoodSize();
        foodSources.push({ x: randomX, y: randomY, size: foodSize });
    }
}

function getRandomFoodSize() {
    const sizeWeights = [10, 20, 30, 40, 50];
    const weightDistribution = [0.4, 0.3, 0.2, 0.07, 0.03];
    let random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < sizeWeights.length; i++) {
        cumulativeWeight += weightDistribution[i];
        if (random <= cumulativeWeight) {
            return sizeWeights[i];
        }
    }
    return 10;
}

function spawnFood() {
    setInterval(() => {
        if (foodSources.length < maxFoodPiles) {
            let randomX, randomY;
            let isTooClose;
            do {
                randomX = Math.random() * (canvas.width - 100) + 50;
                randomY = Math.random() * (canvas.height - 100) + 50;
                isTooClose = nests.some(nest => Math.hypot(randomX - nest.x, randomY - nest.y) < 100);
            } while (isTooClose);

            let foodSize = getRandomFoodSize();
            foodSources.push({ x: randomX, y: randomY, size: foodSize });
        }

        if (foodSpawnInterval > 1000) {
            foodSpawnInterval -= 100;
            clearInterval(spawnFood);
            spawnFood();
        }
    }, foodSpawnInterval);
}

function updateNestSize() {
    nests.forEach(nest => {
        nest.size = Math.min(maxNestSize, 10 + nest.antCount * 0.5 + nest.foodStored * 0.5);  // Cap nest size at 8x initial size
    });
}

function drawHUD() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Time: ${Math.floor(timer / 60)}s`, canvas.width - 120, 30);
    ctx.fillText(`Score: ${score}`, canvas.width - 120, 60);

    ctx.fillText(`Total Ants: ${nests[0].antCount}`, 20, canvas.height - 60);
    ctx.fillText(`Food Stored: ${nests[0].foodStored}`, 20, canvas.height - 30);
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    timer++;
    updateNestSize();

    nests.forEach(nest => {
        ctx.fillStyle = "blue";
        ctx.beginPath();
        ctx.arc(nest.x, nest.y, nest.size,

 0, Math.PI * 2);
        ctx.fill();
    });

    foodSources.forEach(food => {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
        ctx.fill();
    });

    if (pheromoneMarker) {
        pheromoneMarker.draw();
    }

    ants.forEach(ant => {
        ant.update();
        ant.draw();
    });

    drawHUD();

    requestAnimationFrame(update);
}

canvas.addEventListener("click", (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    pheromoneMarker = new PheromoneMarker(mouseX, mouseY);
});

window.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "n":
            const currentNest = nests.find(nest => nest.foodStored >= 20);
            if (currentNest && currentNest.foodStored >= 20) {
                currentNest.foodStored -= 20;
                nests.push({ x: Math.random() * (canvas.width - 100) + 50, y: Math.random() * (canvas.height - 100) + 50, size: 10, antCount: 0, foodStored: 0 });
            }
            break;
        case "a":
            const nestWithFood = nests.find(nest => nest.foodStored >= 1);
            if (nestWithFood && nestWithFood.foodStored >= 1) {
                ants.push(new Ant(nestWithFood.x, nestWithFood.y, nestWithFood.x, nestWithFood.y));
                nestWithFood.antCount++;
                nestWithFood.foodStored--;
                score += 20;
            }
            break;
        case "r":
            pheromoneMarker = null;
            break;
    }
});

initializeSimulation();
spawnFood();
update();