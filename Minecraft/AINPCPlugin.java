package com.segervolervix.ainpc;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.*;
import org.bukkit.inventory.ItemStack;
import org.bukkit.Material;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
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

    private LivingEntity npc;
    private UUID ownerId;
    private BukkitTask aiTask;
    private final List<String> history = new ArrayList<>();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String CHAT_URL = "https://segervolervix.space/api/chat";
    private static final String API_KEY = System.getenv("API_KEY");
    private static final Gson GSON = new Gson();

    @Override
    public void onEnable() {
        Objects.requireNonNull(getCommand("npc")).setExecutor(this);
        getLogger().info("AINPC enabled.");
    }

    @Override
    public void onDisable() {
        if (npc != null && !npc.isDead()) npc.remove();
        if (aiTask != null) aiTask.cancel();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("Players only.");
            return true;
        }

        if (args.length == 0) {
            player.sendMessage("/npc <spawn|ask|remove>");
            return true;
        }

        switch (args[0].toLowerCase()) {
            case "spawn" -> spawnNPC(player, args);
            case "ask" -> askNPC(player, args);
            case "remove" -> removeNPC(player);
        }

        return true;
    }

    private void spawnNPC(Player player, String[] args) {
        if (npc != null && !npc.isDead()) {
            player.sendMessage(ChatColor.RED + "NPC already exists.");
            return;
        }

        String name = args.length >= 2 ? String.join(" ", Arrays.copyOfRange(args, 1, args.length)) : "AI Companion";

        Location loc = player.getLocation();
        World world = loc.getWorld();

        // Piglin Brute = neutral until provoked, good hitbox, good combat
        PiglinBrute brute = world.spawn(loc, PiglinBrute.class, e -> {
            e.setCustomName(ChatColor.AQUA + name);
            e.setCustomNameVisible(true);
            e.setImmuneToZombification(true);
            e.setAdult();
            e.setAI(false); // disable vanilla AI
            e.getEquipment().setItemInMainHand(new ItemStack(Material.IRON_SWORD));
        });

        npc = brute;
        ownerId = player.getUniqueId();
        history.clear();

        startAI();

        player.sendMessage(ChatColor.GREEN + "Spawned AI NPC: " + name);
    }

    private void startAI() {
        if (aiTask != null) aiTask.cancel();

        aiTask = Bukkit.getScheduler().runTaskTimer(this, () -> {
            if (npc == null || npc.isDead()) return;

            Player owner = Bukkit.getPlayer(ownerId);
            if (owner == null) return;

            Location npcLoc = npc.getLocation();
            Location ownerLoc = owner.getLocation();

            double dist = npcLoc.distance(ownerLoc);

         

            // Follow owner
            if (dist > 2) {
                Vector dir = ownerLoc.toVector().subtract(npcLoc.toVector()).normalize().multiply(0.3);
                npc.teleport(npcLoc.add(dir));
            }

            // Attack mobs
            for (Entity e : npc.getNearbyEntities(8, 4, 8)) {
                if (e instanceof Monster monster) {
                    npc.attack(monster);
                    monster.setTarget((LivingEntity) npc);
                    return;
                }
            }

        }, 0L, 5L);
    }

    private void askNPC(Player player, String[] args) {
        if (!exists(player)) return;
        if (!isOwner(player)) {
            player.sendMessage(ChatColor.RED + "Not your NPC.");
            return;
        }

        if (args.length < 2) {
            player.sendMessage("Usage: /npc ask <message>");
            return;
        }

        String message = String.join(" ", Arrays.copyOfRange(args, 1, args.length));
        String npcName = ChatColor.stripColor(npc.getCustomName());

        addHistory("Player", message);

        String systemPrompt = buildSystemPrompt(npcName, player.getName());

        player.sendMessage(ChatColor.GRAY + "[" + npcName + "] Thinking...");

        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            try {
                JsonObject body = new JsonObject();
                body.addProperty("system", systemPrompt);
                body.addProperty("message", message);

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(CHAT_URL))
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + API_KEY)
                        .POST(HttpRequest.BodyPublishers.ofString(GSON.toJson(body), StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                JsonObject json = GSON.fromJson(res.body(), JsonObject.class);

                String reply = json.has("reply") ? json.get("reply").getAsString() : null;

                if (reply == null) {
                    send(() -> player.sendMessage("NPC failed to respond."));
                    return;
                }

                try {
                    JsonObject action = GSON.fromJson(reply, JsonObject.class);
                    if (action.has("action")) {
                        handleAction(player, action);
                        return;
                    }
                } catch (JsonSyntaxException ignored) {}

                String finalReply = reply;
                addHistory("NPC", finalReply);

                send(() -> Bukkit.broadcastMessage(ChatColor.AQUA + "[" + npcName + "] " + ChatColor.WHITE + finalReply));

            } catch (Exception e) {
                send(() -> player.sendMessage("NPC network error."));
            }
        });
    }

    private void handleAction(Player owner, JsonObject action) {
        String type = action.get("action").getAsString();

        switch (type) {
            case "say" -> {
                String msg = action.get("message").getAsString();
                addHistory("NPC", msg);
                send(() -> Bukkit.broadcastMessage(ChatColor.AQUA + "[" + npc.getCustomName() + "] " + ChatColor.WHITE + msg));
            }
            case "walk_to" -> {
                double x = action.get("x").getAsDouble();
                double y = action.get("y").getAsDouble();
                double z = action.get("z").getAsDouble();
                send(() -> npc.teleport(new Location(owner.getWorld(), x, y, z)));
            }
            case "look_at_player" -> {
                send(() -> {
                    Location npcLoc = npc.getLocation();
                    Location ownerLoc = owner.getLocation();
                    npcLoc.setDirection(ownerLoc.toVector().subtract(npcLoc.toVector()));
                    npc.teleport(npcLoc);
                });
            }
        }
    }

    private void removeNPC(Player player) {
        if (!exists(player)) return;
        if (!isOwner(player)) {
            player.sendMessage("Not your NPC.");
            return;
        }

        npc.remove();
        npc = null;
        ownerId = null;

        if (aiTask != null) aiTask.cancel();

        player.sendMessage("NPC removed.");
    }

    private boolean exists(Player p) {
        if (npc == null || npc.isDead()) {
            p.sendMessage("No NPC exists.");
            return false;
        }
        return true;
    }

    private boolean isOwner(Player p) {
        return ownerId != null && ownerId.equals(p.getUniqueId());
    }

    private void addHistory(String who, String msg) {
        history.add(who + ": " + msg);
        if (history.size() > 6) history.remove(0);
    }

    private String buildSystemPrompt(String npcName, String playerName) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are ").append(npcName).append(", an AI companion.\n");
        sb.append("Talking to ").append(playerName).append(".\n");
        sb.append("Recent conversation:\n");
        if (history.isEmpty()) sb.append("(none)\n");
        else history.forEach(line -> sb.append(line).append("\n"));
        sb.append("\nRespond ONLY in JSON:\n");
        sb.append("{\"action\":\"say\",\"message\":\"text\"}\n");
        sb.append("{\"action\":\"walk_to\",\"x\":0,\"y\":0,\"z\":0}\n");
        sb.append("{\"action\":\"look_at_player\"}\n");
        return sb.toString();
    }

    private void send(Runnable r) {
        Bukkit.getScheduler().runTask(this, r);
    }
}
