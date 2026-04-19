package com.segervolervix.ainpc;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.CommandExecutor;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.ChatColor;
import org.bukkit.util.Vector;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

public class AINPCPlugin extends JavaPlugin implements CommandExecutor {

    private ArmorStand npc;
    private UUID ownerId;
    private boolean following = false;
    private BukkitTask followTask;
    private final List<String> history = new ArrayList<>();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String CHAT_URL = "https://segervolervix.space/api/chat";
    private static final String API_KEY = System.getenv("API_KEY"); // or load from config
    private static final Gson GSON = new Gson();

    @Override
    public void onEnable() {
        Objects.requireNonNull(getCommand("npc")).setExecutor(this);
        getLogger().info("AINPC enabled.");
    }

    @Override
    public void onDisable() {
        if (npc != null && !npc.isDead()) {
            npc.remove();
        }
        if (followTask != null) {
            followTask.cancel();
        }
        getLogger().info("AINPC disabled.");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("Only players can use this command.");
            return true;
        }

        if (args.length == 0) {
            player.sendMessage(ChatColor.YELLOW + "Usage: /npc <spawn|ask|follow|stop|remove>");
            return true;
        }

        String sub = args[0].toLowerCase(Locale.ROOT);

        switch (sub) {
            case "spawn" -> handleSpawn(player, args);
            case "ask" -> handleAsk(player, args);
            case "follow" -> handleFollow(player);
            case "stop" -> handleStop(player);
            case "remove" -> handleRemove(player);
            default -> player.sendMessage(ChatColor.YELLOW + "Usage: /npc <spawn|ask|follow|stop|remove>");
        }

        return true;
    }

    private void handleSpawn(Player player, String[] args) {
        if (npc != null && !npc.isDead()) {
            player.sendMessage(ChatColor.RED + "There is already an AI NPC in the world.");
            return;
        }

        String name = (args.length >= 2)
                ? String.join(" ", Arrays.copyOfRange(args, 1, args.length))
                : "AI Companion";

        Location loc = player.getLocation();
        World world = loc.getWorld();

        npc = world.spawn(loc, ArmorStand.class, stand -> {
            stand.setCustomName(ChatColor.AQUA + name);
            stand.setCustomNameVisible(true);
            stand.setGravity(false);
            stand.setInvisible(false);
            stand.setBasePlate(false);
            stand.setArms(true);
        });

        ownerId = player.getUniqueId();
        history.clear();
        following = false;

        player.sendMessage(ChatColor.GREEN + "Spawned AI NPC: " + ChatColor.AQUA + name);
        Bukkit.broadcastMessage(ChatColor.GRAY + "[AI NPC] " + ChatColor.AQUA + name +
                ChatColor.GRAY + " has appeared, owned by " + ChatColor.YELLOW + player.getName());
    }

    private void handleAsk(Player player, String[] args) {
        if (!checkNpcExists(player)) return;
        if (!isOwner(player)) {
            player.sendMessage(ChatColor.RED + "This NPC does not belong to you.");
            return;
        }

        if (args.length < 2) {
            player.sendMessage(ChatColor.YELLOW + "Usage: /npc ask <message>");
            return;
        }

        String message = String.join(" ", Arrays.copyOfRange(args, 1, args.length)).trim();
        if (message.isEmpty()) {
            player.sendMessage(ChatColor.YELLOW + "Please provide a message.");
            return;
        }

        String npcName = ChatColor.stripColor(npc.getCustomName());
        String playerName = player.getName();

        addHistory("Player", message);

        String systemPrompt = buildSystemPrompt(npcName, playerName);

        player.sendMessage(ChatColor.GRAY + "[" + npcName + "] " + ChatColor.DARK_GRAY + "Thinking...");

        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            try {
                JsonObject body = new JsonObject();
                body.addProperty("system", systemPrompt);
                body.addProperty("message", message);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(CHAT_URL))
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + API_KEY)
                        .POST(HttpRequest.BodyPublishers.ofString(GSON.toJson(body), StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                String responseBody = response.body();

                JsonObject json = GSON.fromJson(responseBody, JsonObject.class);
                String reply = json.has("reply") ? json.get("reply").getAsString() : null;

                if (reply == null || reply.isEmpty()) {
                    sendToMainThread(() ->
                            player.sendMessage(ChatColor.RED + "NPC failed to respond (invalid API response)."));
                    return;
                }

                // Try to interpret reply as JSON action
                try {
                    JsonObject actionObj = GSON.fromJson(reply, JsonObject.class);
                    if (actionObj != null && actionObj.has("action")) {
                        handleActionFromAI(player, npcName, actionObj);
                        return;
                    }
                } catch (JsonSyntaxException ignored) {
                    // Not JSON, treat as plain chat
                }

                String finalReply = reply;
                addHistory("NPC", finalReply);

                sendToMainThread(() -> {
                    String formatted = ChatColor.AQUA + "[" + npcName + "] " + ChatColor.WHITE + finalReply;
                    Bukkit.broadcastMessage(formatted);
                });

            } catch (Exception e) {
                getLogger().warning("Error calling AI API: " + e.getMessage());
                sendToMainThread(() ->
                        player.sendMessage(ChatColor.RED + "NPC failed to respond (network error)."));
            }
        });
    }

    private void handleActionFromAI(Player owner, String npcName, JsonObject actionObj) {
        String action = actionObj.get("action").getAsString();

        switch (action) {
            case "say" -> {
                String msg = actionObj.has("message") ? actionObj.get("message").getAsString() : "";
                if (!msg.isEmpty()) {
                    addHistory("NPC", msg);
                    sendToMainThread(() -> {
                        String formatted = ChatColor.AQUA + "[" + npcName + "] " + ChatColor.WHITE + msg;
                        Bukkit.broadcastMessage(formatted);
                    });
                }
            }
            case "follow_player" -> sendToMainThread(() -> handleFollow(owner));
            case "stop_following" -> sendToMainThread(() -> handleStop(owner));
            case "walk_to" -> {
                if (actionObj.has("x") && actionObj.has("y") && actionObj.has("z")) {
                    double x = actionObj.get("x").getAsDouble();
                    double y = actionObj.get("y").getAsDouble();
                    double z = actionObj.get("z").getAsDouble();
                    sendToMainThread(() -> {
                        if (npc != null && !npc.isDead()) {
                            Location target = new Location(owner.getWorld(), x, y, z);
                            npc.teleport(target);
                        }
                    });
                }
            }
            case "look_at_player" -> sendToMainThread(() -> {
                if (npc != null && !npc.isDead()) {
                    Location npcLoc = npc.getLocation();
                    Location ownerLoc = owner.getLocation();
                    npcLoc.setDirection(ownerLoc.toVector().subtract(npcLoc.toVector()));
                    npc.teleport(npcLoc);
                }
            });
            default -> {
                // Unknown action: ignore or log
                getLogger().info("Unknown AI action: " + action);
            }
        }
    }

    private void handleFollow(Player player) {
        if (!checkNpcExists(player)) return;
        if (!isOwner(player)) {
            player.sendMessage(ChatColor.RED + "This NPC does not belong to you.");
            return;
        }

        if (following) {
            player.sendMessage(ChatColor.YELLOW + "The NPC is already following you.");
            return;
        }

        following = true;
        player.sendMessage(ChatColor.GREEN + "The NPC will now follow you.");

        if (followTask != null) {
            followTask.cancel();
        }

        followTask = Bukkit.getScheduler().runTaskTimer(this, () -> {
            if (npc == null || npc.isDead()) {
                following = false;
                if (followTask != null) followTask.cancel();
                return;
            }

            Player owner = Bukkit.getPlayer(ownerId);
            if (owner == null || !owner.isOnline()) {
                following = false;
                if (followTask != null) followTask.cancel();
                return;
            }

            Location npcLoc = npc.getLocation();
            Location ownerLoc = owner.getLocation();

            if (!npcLoc.getWorld().equals(ownerLoc.getWorld())) {
                npc.teleport(ownerLoc);
                return;
            }

            double distance = npcLoc.distance(ownerLoc);
            if (distance > 10) {
                npc.teleport(ownerLoc);
                return;
            }

            if (distance > 2) {
                Vector direction = ownerLoc.toVector().subtract(npcLoc.toVector()).normalize().multiply(0.4);
                Location newLoc = npcLoc.clone().add(direction);
                newLoc.setDirection(ownerLoc.toVector().subtract(newLoc.toVector()));
                npc.teleport(newLoc);
            }

        }, 0L, 5L); // every 5 ticks
    }

    private void handleStop(Player player) {
        if (!checkNpcExists(player)) return;
        if (!isOwner(player)) {
            player.sendMessage(ChatColor.RED + "This NPC does not belong to you.");
            return;
        }

        if (!following) {
            player.sendMessage(ChatColor.YELLOW + "The NPC is not following you.");
            return;
        }

        following = false;
        if (followTask != null) {
            followTask.cancel();
            followTask = null;
        }

        player.sendMessage(ChatColor.GREEN + "The NPC stopped following you.");
    }

    private void handleRemove(Player player) {
        if (!checkNpcExists(player)) return;
        if (!isOwner(player)) {
            player.sendMessage(ChatColor.RED + "This NPC does not belong to you.");
            return;
        }

        if (npc != null && !npc.isDead()) {
            npc.remove();
        }
        npc = null;
        ownerId = null;
        following = false;
        if (followTask != null) {
            followTask.cancel();
            followTask = null;
        }
        history.clear();

        player.sendMessage(ChatColor.GREEN + "Your AI NPC has been removed.");
    }

    private boolean checkNpcExists(Player player) {
        if (npc == null || npc.isDead()) {
            player.sendMessage(ChatColor.RED + "There is no AI NPC currently spawned.");
            return false;
        }
        return true;
    }

    private boolean isOwner(Player player) {
        return ownerId != null && ownerId.equals(player.getUniqueId());
    }

    private void addHistory(String speaker, String content) {
        history.add(speaker + ": " + content);
        if (history.size() > 6) { // keep last 6 lines
            history.remove(0);
        }
    }

    private String buildSystemPrompt(String npcName, String playerName) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are ").append(npcName).append(", an AI companion NPC inside Minecraft.\n");
        sb.append("You are currently talking to player: ").append(playerName).append(".\n");
        sb.append("Recent conversation:\n");
        if (history.isEmpty()) {
            sb.append("(No previous messages)\n");
        } else {
            for (String line : history) {
                sb.append(line).append("\n");
            }
        }
        sb.append("\n");
        sb.append("You must respond ONLY in JSON, with one of these actions:\n");
        sb.append("{\"action\":\"say\",\"message\":\"text to say in chat\"}\n");
        sb.append("{\"action\":\"follow_player\"}\n");
        sb.append("{\"action\":\"stop_following\"}\n");
        sb.append("{\"action\":\"walk_to\",\"x\":<number>,\"y\":<number>,\"z\":<number>}\n");
        sb.append("{\"action\":\"look_at_player\"}\n");
        sb.append("Do not include any extra text outside the JSON.\n");
        return sb.toString();
    }

    private void sendToMainThread(Runnable runnable) {
        Bukkit.getScheduler().runTask(this, runnable);
    }
}
