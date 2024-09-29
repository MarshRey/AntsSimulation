import pygame
import random
import math

# Initialize Pygame
pygame.init()

# Window size
WIDTH, HEIGHT = 800, 600
window = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Ant Simulation Game")

# Colors
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
BLACK = (0, 0, 0)
LIGHT_BLUE = (173, 216, 230)

# Pheromone Marker with Decay
class Pheromone:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.strength = 255  # Full strength at the start

    def decay(self):
        """Reduce pheromone strength over time."""
        self.strength -= 1  # Decay rate
        if self.strength < 0:
            self.strength = 0

    def is_active(self):
        """Check if pheromone is still active."""
        return self.strength > 0

    def draw(self, window):
        """Draw pheromone with fading strength."""
        pygame.draw.circle(window, (self.strength, self.strength, 0), (self.x, self.y), 5)

# Ant Class
class Ant:
    def __init__(self, x, y, nest_x, nest_y):
        self.x = x
        self.y = y
        self.has_food = False
        self.nest_x = nest_x
        self.nest_y = nest_y

    def move_towards(self, target_x, target_y):
        """Move the ant towards the target location."""
        if target_x == self.x and target_y == self.y:
            return  # Already there
        dx, dy = target_x - self.x, target_y - self.y
        dist = math.hypot(dx, dy)
        dx, dy = dx / dist, dy / dist  # Normalize direction
        self.x += dx * 2  # Move ant with speed 2
        self.y += dy * 2

    def wander(self):
        """Wander randomly near the nest if no pheromones are present."""
        self.x += random.choice([-1, 0, 1])
        self.y += random.choice([-1, 0, 1])

    def update(self, pheromones, food_sources):
        if self.has_food:
            self.move_towards(self.nest_x, self.nest_y)
            if math.hypot(self.x - self.nest_x, self.y - self.nest_y) < 10:  # Close to nest
                self.has_food = False
                return True  # Ant returned food, spawn a new ant
        else:
            # Check if ant is near food (doubled detection distance)
            for food in food_sources:
                if math.hypot(self.x - food[0], self.y - food[1]) < 20:  # Double distance to 20
                    self.has_food = True
                    return False

            # Move towards pheromones if there is no food
            if pheromones:
                closest_pheromone = pheromones[-1]  # Only follow the latest pheromone
                self.move_towards(closest_pheromone.x, closest_pheromone.y)
            else:
                # Wander around near the nest
                self.wander()

        return False

# Simulation variables
nests = [(WIDTH // 2, HEIGHT // 2)]
food_sources = [(random.randint(50, WIDTH - 50), random.randint(50, HEIGHT - 50))]
pheromone = None  # Only one pheromone at a time
ants = [Ant(WIDTH // 2, HEIGHT // 2, WIDTH // 2, HEIGHT // 2) for _ in range(3)]  # Start with 3 ants

# Game settings
debug_mode = False
spawn_mode = None  # Can be "nest", "food", or "ant"

# Font for text
font = pygame.font.SysFont("Arial", 16)

# Button feedback system
button_feedback = {}

def handle_button_feedback(event_key):
    """Start the feedback animation when a button is pressed."""
    button_feedback[event_key] = {'size': 1.0, 'alpha': 255, 'duration': 0.5}  # Shorter and more subtle feedback

def update_button_feedback():
    """Update the shrinking and fading effect for button press feedback."""
    for key in list(button_feedback.keys()):
        button_feedback[key]['size'] -= 0.02  # Faster size reduction
        button_feedback[key]['alpha'] -= 10  # Faster fade-out
        button_feedback[key]['duration'] -= 0.1  # Faster duration
        if button_feedback[key]['duration'] <= 0:
            del button_feedback[key]  # Remove finished feedback

def draw_button_feedback(window, text, pos):
    """Draw shrinking and fading text for feedback."""
    for key, feedback in button_feedback.items():
        label = font.render(text, True, WHITE)
        label = pygame.transform.rotozoom(label, 0, feedback['size'])
        label.set_alpha(feedback['alpha'])
        window.blit(label, pos)

# Main game loop
running = True
while running:
    window.fill(BLACK)

    # Draw nests
    for nest in nests:
        pygame.draw.circle(window, BLUE, nest, 10)

    # Draw food piles
    for food in food_sources:
        pygame.draw.circle(window, RED, food, 10)

    # Draw pheromone
    if pheromone:
        pheromone.decay()
        if pheromone.is_active():
            pheromone.draw(window)
        else:
            pheromone = None  # Remove pheromone if it's decayed

    # Draw ants
    for ant in ants:
        pygame.draw.circle(window, GREEN if not ant.has_food else RED, (int(ant.x), int(ant.y)), 5)
        if ant.update([pheromone] if pheromone else [], food_sources):
            # Spawn a new ant at the nest if food is returned
            ants.append(Ant(ant.nest_x, ant.nest_y, ant.nest_x, ant.nest_y))

    # Event handling
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.MOUSEBUTTONDOWN:
            mouse_x, mouse_y = pygame.mouse.get_pos()

            # Debug mode: Place nests, food, or ants
            if debug_mode:
                if spawn_mode == "nest":
                    nests.append((mouse_x, mouse_y))
                elif spawn_mode == "food":
                    food_sources.append((mouse_x, mouse_y))
                elif spawn_mode == "ant":
                    if nests:
                        nest_x, nest_y = random.choice(nests)
                        ants.append(Ant(mouse_x, mouse_y, nest_x, nest_y))
            else:
                # Place a new pheromone, replacing the old one
                pheromone = Pheromone(mouse_x, mouse_y)

        elif event.type == pygame.KEYDOWN:
            handle_button_feedback(event.key)
            # Toggle debug mode
            if event.key == pygame.K_d:
                debug_mode = not debug_mode
            elif event.key == pygame.K_n:
                spawn_mode = "nest"
            elif event.key == pygame.K_f:
                spawn_mode = "food"
            elif event.key == pygame.K_a:
                spawn_mode = "ant"
            elif event.key == pygame.K_r:
                # Remove the pheromone
                pheromone = None

    # Draw control instructions box (top left corner)
    pygame.draw.rect(window, (0, 0, 0, 128), (10, 10, 250, 120))  # Semi-transparent background
    text_color = BLUE if debug_mode else WHITE  # Toggle instructions color based on debug mode
    controls_text = [
        "Controls:",
        "D - Toggle Debug Mode",
        "N - Place Nest (Debug)",
        "F - Place Food (Debug)",
        "A - Place Ant (Debug)",
        "R - Remove Pheromone",
        "Click - Place Pheromone"
    ]
    for i, line in enumerate(controls_text):
        text_surface = font.render(line, True, text_color)
        window.blit(text_surface, (15, 15 + i * 20))

    # Draw shrinking and fading feedback for pressed buttons
    update_button_feedback()
    if pygame.K_d in button_feedback:
        draw_button_feedback(window, "D - Toggle Debug Mode", (15, 15 + 1 * 20))
    if pygame.K_n in button_feedback:
        draw_button_feedback(window, "N - Place Nest (Debug)", (15, 15 + 2 * 20))
    if pygame.K_f in button_feedback:
        draw_button_feedback(window, "F - Place Food (Debug)", (15, 15 + 3 * 20))
    if pygame.K_a in button_feedback:
        draw_button_feedback(window, "A - Place Ant (Debug)", (15, 15 + 4 * 20))
    if pygame.K_r in button_feedback:
        draw_button_feedback(window, "R - Remove Pheromone", (15, 15 + 5 * 20))

    pygame.display.flip()
    pygame.time.delay(100)

pygame.quit()