const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

// Simulation Variables
let ants = [];
let nests = [{ x: canvas.width / 2, y: canvas.height / 2, size: 10, antCount: 3, foodStored: 0 }];
let foodSources = [];
let pheromoneMarker = null;  // Single pheromone marker placed by the player
const foodCapacity = 10;
const maxFoodPiles = 10;
const antSpeed = 1;  // Slower speed
const foodDetectionRadius = 8 * 5;  // Ant detection range for food (8 times the ant's radius)

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
            }
        } else if (foodNearby) {
            // Move towards nearby food and pick it up
            this.moveTowards(foodNearby.x, foodNearby.y);
            if (Math.hypot(this.x - foodNearby.x, this.y - foodNearby.y) < foodNearby.size) {
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
        ctx.fillStyle = this.hasFood ? "red" : "green";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
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
        foodSources.push({ x: randomX, y: randomY, size: foodCapacity });
    }
}

// Function to spawn food every 5 seconds, limiting to 10 piles
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
            foodSources.push({ x: randomX, y: randomY, size: foodCapacity });
        }
    }, 5000);
}

// Function to update the size of nests based on the number of ants and food stored
function updateNestSize() {
    nests.forEach(nest => {
        nest.size = 10 + nest.antCount * 0.5 + nest.foodStored * 0.5;  // Nest size grows with ants and food
    });
}

// Animation loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    requestAnimationFrame(update);
}

// Event Listeners for placing pheromone markers
canvas.addEventListener("click", (e) => {
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    // Place a yellow marker where the player clicks
    pheromoneMarker = new PheromoneMarker(mouseX, mouseY);
});

window.addEventListener("keydown", (e) => {
    const control = document.getElementById("controls");

    control.classList.add("pressed");
    setTimeout(() => control.classList.remove("pressed"), 100);

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