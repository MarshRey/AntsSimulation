const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Simulation Variables
let ants = [];
let nests = [{ x: canvas.width / 2, y: canvas.height / 2, size: 10, antCount: 3, foodStored: 0 }];
let foodSources = [];
let pheromoneMarker = null;  // Single pheromone marker placed by the player
const maxFoodPiles = 10;
const antSpeed = 1;  // Slower speed
const foodDetectionRadius = 2 * 5;  // Ant detection range for food (double the ant's radius)
let score = 0;
let timer = 0;
let foodSpawnInterval = 5000;  // Initial interval for food spawning (5 seconds)

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
        // Change direction less often
        this.changeDirectionCountdown -= 1;
        if (this.changeDirectionCountdown <= 0) {
            this.currentDirection = { dx: Math.random() * 2 - 1, dy: Math.random() * 2 - 1 };
            this.changeDirectionCountdown = Math.floor(Math.random() * 500) + 100;  // Reset countdown
        }

        // Wander in the current direction
        this.x += this.currentDirection.dx * antSpeed;
        this.y += this.currentDirection.dy * antSpeed;
    }

    update() {
        this.avoidCollision();

        // Check for nearby food within detection radius
        let foodNearby = null;
        for (const food of foodSources) {
            if (Math.hypot(this.x - food.x, this.y - food.y) < foodDetectionRadius) {
                foodNearby = food;
                break;
            }
        }

        if (this.hasFood) {
            // Return to the nest when carrying food
            this.moveTowards(this.nest_x, this.nest_y);

            if (Math.hypot(this.x - this.nest_x, this.y - this.nest_y) < nests[0].size) {
                this.hasFood = false;
                nests[0].foodStored += 1;
                score += 10;  // Add score for food delivery
            }
        } else if (foodNearby) {
            // Move towards the edge of the food pile, not the center
            const dx = foodNearby.x - this.x;
            const dy = foodNearby.y - this.y;
            const distanceToFood = Math.hypot(dx, dy);

            // Stop at the edge of the food pile, which is the sum of the ant's radius and the food's radius
            const stopDistance = this.radius + foodNearby.size;
            if (distanceToFood > stopDistance) {
                // Move towards the edge of the food pile
                this.moveTowards(foodNearby.x, foodNearby.y);
            } else {
                // If close enough to the edge, collect food
                this.hasFood = true;
                this.lastFoodX = foodNearby.x;
                this.lastFoodY = foodNearby.y;
                foodNearby.size -= 1;
                if (foodNearby.size <= 0) {
                    foodSources = foodSources.filter(f => f !== foodNearby);
                }
            }
        } else {
            // If no food nearby, follow the pheromone marker or wander
            if (pheromoneMarker) {
                this.moveTowards(pheromoneMarker.x, pheromoneMarker.y);
            } else {
                this.wander();
            }
        }
    }

    draw() {
        // Draw the ant body
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // If the ant has food, draw a small red circle on its body
        if (this.hasFood) {
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);  // Smaller red circle
            ctx.fill();
        }
    }
}

// Initialize ants and food
function initializeSimulation() {
    for (let i = 0; i < nests[0].antCount; i++) {
        ants.push(new Ant(nests[0].x, nests[0].y, nests[0].x, nests[0].y));
    }

    // Spawn some initial food
    for (let i = 0; i < 3; i++) {  // Add 3 initial food piles
        let randomX = Math.random() * (canvas.width - 100) + 50;
        let randomY = Math.random() * (canvas.height - 100) + 50;
        let foodSize = getRandomFoodSize();  // Random food size between 10 and 50
        foodSources.push({ x: randomX, y: randomY, size: foodSize });
    }
}

// Function to get a random food size between 10 and 50, larger sizes spawn less often
function getRandomFoodSize() {
    const sizeWeights = [10, 20, 30, 40, 50];  // Possible food sizes
    const weightDistribution = [0.4, 0.3, 0.2, 0.07, 0.03];  // Larger piles spawn less often

    let random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < sizeWeights.length; i++) {
        cumulativeWeight += weightDistribution[i];
        if (random <= cumulativeWeight) {
            return sizeWeights[i];
        }
    }
    return 10;  // Default to smallest size
}

// Function to spawn food, speed increases as the game progresses
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

            let foodSize = getRandomFoodSize();  // Random food size between 10 and 50
            foodSources.push({ x: randomX, y: randomY, size: foodSize });
        }

        // Decrease the food spawn interval over time (to make food spawn faster)
        if (foodSpawnInterval > 1000) {
            foodSpawnInterval -= 100;
            clearInterval(spawnFood);  // Clear the existing interval
            spawnFood();  // Restart with a faster interval
        }
    }, foodSpawnInterval);
}

// Function to update the size of nests based on the number of ants and food stored
function updateNestSize() {
    nests.forEach(nest => {
        nest.size = 10 + nest.antCount * 0.5 + nest.foodStored * 0.5;  // Nest size grows with ants and food
    });
}

// Draw the timer and score in the top-right corner
function drawHUD() {
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Time: ${Math.floor(timer / 60)}s`, canvas.width - 120, 30);  // Timer in seconds
    ctx.fillText(`Score: ${score}`, canvas.width - 120, 60);  // Score display
}

// Animation loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update timer
    timer++;

    // Update nest size based on ants and food stored
    updateNestSize();

    // Draw nests
    nests.forEach(nest => {
        ctx.fillStyle = "blue";
        ctx.beginPath();
        ctx.arc(nest.x, nest.y, nest.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.fillText(`Food Stored: ${nest.foodStored}`, nest.x - 20, nest.y - nest.size - 10);
    });

    // Draw food sources
    foodSources.forEach(food => {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw pheromone marker if placed
    if (pheromoneMarker) {
        pheromoneMarker.draw();
    }

    // Update and draw ants
    ants.forEach(ant => {
        ant.update();
        ant.draw();
    });

    // Draw the timer and score
    drawHUD();

    requestAnimationFrame(update);
}

// Event Listeners for placing pheromone markers behind instructions
canvas.addEventListener("click", (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Place a yellow marker where the player clicks
    pheromoneMarker = new PheromoneMarker(mouseX, mouseY);
});

// Keydown event for adding nests, spawning ants, and removing pheromone markers
window.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "n":  // Build a new nest
            const currentNest = nests.find(nest => nest.foodStored >= 20);
            if (currentNest && currentNest.foodStored >= 20) {
                currentNest.foodStored -= 20;
                nests.push({ x: Math.random() * (canvas.width - 100) + 50, y: Math.random() * (canvas.height - 100) + 50, size: 10, antCount: 0, foodStored: 0 });
            }
            break;
        case "a":  // Spawn a new ant
            const nestWithFood = nests.find(nest => nest.foodStored >= 1);
            if (nestWithFood && nestWithFood.foodStored >= 1) {
                ants.push(new Ant(nestWithFood.x, nestWithFood.y, nestWithFood.x, nestWithFood.y));
                nestWithFood.antCount++;
                nestWithFood.foodStored--;
                score += 20;  // Add score for spawning an ant
            }
            break;
        case "r":  // Remove the pheromone marker
            pheromoneMarker = null;
            break;
    }
});

// Initialize the simulation
initializeSimulation();

// Start the animation loop and food spawning
spawnFood();
update();