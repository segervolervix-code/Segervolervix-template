                        package com.segervolervix.ainpc;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.*;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

public class AINPCPlugin extends JavaPlugin implements CommandExecutor, Listener {

    private Mob npc; [span_6](start_span)// Changed to Mob to access Pathfinder[span_6](end_span)
    [span_7](start_span)private UUID ownerId;[span_7](end_span)
    [span_8](start_span)private BukkitTask aiTask;[span_8](end_span)
    [span_9](start_span)private final List<String> history = new ArrayList<>();[span_9](end_span)
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            [span_10](start_span).build();[span_10](end_span)

    [span_11](start_span)private static final String CHAT_URL = "https://segervolervix.space/api/chat";[span_11](end_span)
    [span_12](start_span)private static final String API_KEY = System.getenv("API_KEY");[span_12](end_span)
    [span_13](start_span)private static final Gson GSON = new Gson();[span_13](end_span)

    @Override
    public void onEnable() {
        [span_14](start_span)Objects.requireNonNull(getCommand("npc")).setExecutor(this);[span_14](end_span)
        Bukkit.getPluginManager().registerEvents(this, this); [span_15](start_span)// Register death listener[span_15](end_span)
        [span_16](start_span)getLogger().info("AINPC enabled with walking and respawn logic.");[span_16](end_span)
    }

    @Override
    public void onDisable() {
        [span_17](start_span)if (npc != null && !npc.isDead()) npc.remove();[span_17](end_span)
        [span_18](start_span)if (aiTask != null) aiTask.cancel();[span_18](end_span)
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            [span_19](start_span)sender.sendMessage("Players only.");[span_19](end_span)
            [span_20](start_span)return true;[span_20](end_span)
        }

        if (args.length == 0) {
            [span_21](start_span)player.sendMessage("/npc <spawn|ask|remove>");[span_21](end_span)
            [span_22](start_span)return true;[span_22](end_span)
        }

        switch (args[0].toLowerCase()) {
            [span_23](start_span)case "spawn" -> spawnNPC(player, args);[span_23](end_span)
            [span_24](start_span)case "ask" -> askNPC(player, args);[span_24](end_span)
            [span_25](start_span)case "remove" -> removeNPC(player);[span_25](end_span)
        }

        [span_26](start_span)return true;[span_26](end_span)
    }

    private void spawnNPC(Player player, String[] args) {
        if (npc != null && !npc.isDead()) {
            [span_27](start_span)player.sendMessage(ChatColor.RED + "NPC already exists.");[span_27](end_span)
            [span_28](start_span)return;[span_28](end_span)
        }

        String name = args.length >= 2 ?
                [span_29](start_span)String.join(" ", Arrays.copyOfRange(args, 1, args.length)) : "AI Companion";[span_29](end_span)

        Location loc = player.getLocation();
        createNPC(loc, name); [span_30](start_span)// Helper method for spawning[span_30](end_span)
        
        [span_31](start_span)ownerId = player.getUniqueId();[span_31](end_span)
        [span_32](start_span)history.clear();[span_32](end_span)
        [span_33](start_span)startAI();[span_33](end_span)

        [span_34](start_span)player.sendMessage(ChatColor.GREEN + "Spawned AI NPC: " + name);[span_34](end_span)
    }

    private void createNPC(Location loc, String name) {
        [span_35](start_span)World world = loc.getWorld();[span_35](end_span)
        [span_36](start_span)npc = (Mob) world.spawn(loc, PiglinBrute.class, e -> {[span_36](end_span)
            [span_37](start_span)e.setCustomName(ChatColor.AQUA + name);[span_37](end_span)
            [span_38](start_span)e.setCustomNameVisible(true);[span_38](end_span)
            [span_39](start_span)e.setImmuneToZombification(true);[span_39](end_span)
            [span_40](start_span)e.setAdult();[span_40](end_span)
            e.setAI(true); [span_41](start_span)// Must be true for Pathfinding to function[span_41](end_span)
            [span_42](start_span)e.getEquipment().setItemInMainHand(new ItemStack(Material.IRON_SWORD));[span_42](end_span)
        });
    }

    @EventHandler
    public void onNPCDeath(EntityDeathEvent event) {
        if (npc != null && event.getEntity().equals(npc)) {
            Player owner = Bukkit.getPlayer(ownerId);
            if (owner != null) {
                owner.sendMessage(ChatColor.RED + npc.getCustomName() + " has fallen! Respawning at world spawn...");
            }

            [span_43](start_span)// Task to respawn after 5 seconds (100 ticks)[span_43](end_span)
            Bukkit.getScheduler().runTaskLater(this, () -> {
                if (ownerId == null) return;
                
                World world = Bukkit.getWorlds().get(0);
                Location spawnLoc = world.getSpawnLocation();
                String oldName = ChatColor.stripColor(event.getEntity().getCustomName());
                
                createNPC(spawnLoc, oldName);
                startAI();
                
                if (owner != null && owner.isOnline()) {
                    owner.sendMessage(ChatColor.GREEN + oldName + " has respawned at world spawn.");
                }
            }, 100L);
        }
    }

    private void startAI() {
        [span_44](start_span)if (aiTask != null) aiTask.cancel();[span_44](end_span)
        [span_45](start_span)aiTask = Bukkit.getScheduler().runTaskTimer(this, () -> {[span_45](end_span)
            [span_46](start_span)if (npc == null || npc.isDead()) return;[span_46](end_span)

            [span_47](start_span)Player owner = Bukkit.getPlayer(ownerId);[span_47](end_span)
            [span_48](start_span)if (owner == null) return;[span_48](end_span)

            [span_49](start_span)Location npcLoc = npc.getLocation();[span_49](end_span)
            [span_50](start_span)Location ownerLoc = owner.getLocation();[span_50](end_span)
            [span_51](start_span)double dist = npcLoc.distance(ownerLoc);[span_51](end_span)

            [span_52](start_span)// Walking Effect Logic[span_52](end_span)
            if (dist > 4.0) {
                npc.getPathfinder().moveTo(ownerLoc, 1.3); [span_53](start_span)// Moves with walking animation[span_53](end_span)
            } else if (dist < 2.0) {
                [span_54](start_span)npc.getPathfinder().stopPathfinding();[span_54](end_span)
            }

            [span_55](start_span)// Attack logic[span_55](end_span)
            if (npc.getTarget() == null) {
                for (Entity e : npc.getNearbyEntities(8, 4, 8)) {
                    if (e instanceof Monster monster && !(e instanceof Piglin)) {
                        [span_56](start_span)npc.setTarget(monster);[span_56](end_span)
                        [span_57](start_span)return;[span_57](end_span)
                    }
                }
            }
        [span_58](start_span)}, 0L, 5L);[span_58](end_span)
    }

    private void askNPC(Player player, String[] args) {
        [span_59](start_span)if (!exists(player)) return;[span_59](end_span)
        if (!isOwner(player)) {
            [span_60](start_span)player.sendMessage(ChatColor.RED + "Not your NPC.");[span_60](end_span)
            [span_61](start_span)return;[span_61](end_span)
        }

        if (args.length < 2) {
            [span_62](start_span)player.sendMessage("Usage: /npc ask <message>");[span_62](end_span)
            [span_63](start_span)return;[span_63](end_span)
        }

        [span_64](start_span)String message = String.join(" ", Arrays.copyOfRange(args, 1, args.length));[span_64](end_span)
        [span_65](start_span)String npcName = ChatColor.stripColor(npc.getCustomName());[span_65](end_span)

        [span_66](start_span)addHistory("Player", message);[span_66](end_span)
        [span_67](start_span)String systemPrompt = buildSystemPrompt(npcName, player.getName());[span_67](end_span)

        [span_68](start_span)player.sendMessage(ChatColor.GRAY + "[" + npcName + "] Thinking...");[span_68](end_span)
        [span_69](start_span)Bukkit.getScheduler().runTaskAsynchronously(this, () -> {[span_69](end_span)
            try {
                JsonObject body = new JsonObject();
                body.addProperty("system", systemPrompt);
                [span_70](start_span)body.addProperty("message", message);[span_70](end_span)

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(CHAT_URL))
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + API_KEY)
                        .POST(HttpRequest.BodyPublishers.ofString(GSON.toJson(body), StandardCharsets.UTF_8))
                        [span_71](start_span).build();[span_71](end_span)

                [span_72](start_span)HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());[span_72](end_span)
                [span_73](start_span)JsonObject json = GSON.fromJson(res.body(), JsonObject.class);[span_73](end_span)

                [span_74](start_span)String reply = json.has("reply") ? json.get("reply").getAsString() : null;[span_74](end_span)

                if (reply == null) {
                    [span_75](start_span)send(() -> player.sendMessage("NPC failed to respond."));[span_75](end_span)
                    [span_76](start_span)return;[span_76](end_span)
                }

                try {
                    [span_77](start_span)JsonObject action = GSON.fromJson(reply, JsonObject.class);[span_77](end_span)
                    if (action.has("action")) {
                        [span_78](start_span)handleAction(player, action);[span_78](end_span)
                        [span_79](start_span)return;[span_79](end_span)
                    }
                } catch (JsonSyntaxException ignored) {}

                [span_80](start_span)String finalReply = reply;[span_80](end_span)
                [span_81](start_span)addHistory("NPC", finalReply);[span_81](end_span)
                [span_82](start_span)send(() -> Bukkit.broadcastMessage(ChatColor.AQUA + "[" + npcName + "] " + ChatColor.WHITE + finalReply));[span_82](end_span)
            } catch (Exception e) {
                [span_83](start_span)send(() -> player.sendMessage("NPC network error."));[span_83](end_span)
            }
        });
    }

    private void handleAction(Player owner, JsonObject action) {
        [span_84](start_span)String type = action.get("action").getAsString();[span_84](end_span)
        switch (type) {
            case "say" -> {
                [span_85](start_span)String msg = action.get("message").getAsString();[span_85](end_span)
                [span_86](start_span)addHistory("NPC", msg);[span_86](end_span)
                [span_87](start_span)send(() -> Bukkit.broadcastMessage(ChatColor.AQUA + "[" + npc.getCustomName() + "] " + ChatColor.WHITE + msg));[span_87](end_span)
            }
            case "walk_to" -> {
                [span_88](start_span)double x = action.get("x").getAsDouble();[span_88](end_span)
                [span_89](start_span)double y = action.get("y").getAsDouble();[span_89](end_span)
                [span_90](start_span)double z = action.get("z").getAsDouble();[span_90](end_span)
                [span_91](start_span)send(() -> npc.getPathfinder().moveTo(new Location(owner.getWorld(), x, y, z), 1.2));[span_91](end_span)
            }
            case "look_at_player" -> {
                send(() -> {
                    Location npcLoc = npc.getLocation();
                    Location ownerLoc = owner.getLocation();
                    [span_92](start_span)npcLoc.setDirection(ownerLoc.toVector().subtract(npcLoc.toVector()));[span_92](end_span)
                    [span_93](start_span)npc.teleport(npcLoc);[span_93](end_span)
                });
            }
        }
    }

    private void removeNPC(Player player) {
        [span_94](start_span)if (!exists(player)) return;[span_94](end_span)
        if (!isOwner(player)) {
            [span_95](start_span)player.sendMessage("Not your NPC.");[span_95](end_span)
            [span_96](start_span)return;[span_96](end_span)
        }

        [span_97](start_span)npc.remove();[span_97](end_span)
        [span_98](start_span)npc = null;[span_98](end_span)
        [span_99](start_span)ownerId = null;[span_99](end_span)

        [span_100](start_span)if (aiTask != null) aiTask.cancel();[span_100](end_span)
        [span_101](start_span)player.sendMessage("NPC removed.");[span_101](end_span)
    }

    private boolean exists(Player p) {
        if (npc == null || npc.isDead()) {
            [span_102](start_span)p.sendMessage("No NPC exists.");[span_102](end_span)
            [span_103](start_span)return false;[span_103](end_span)
        }
        [span_104](start_span)return true;[span_104](end_span)
    }

    private boolean isOwner(Player p) {
        [span_105](start_span)return ownerId != null && ownerId.equals(p.getUniqueId());[span_105](end_span)
    }

    private void addHistory(String who, String msg) {
        [span_106](start_span)history.add(who + ": " + msg);[span_106](end_span)
        [span_107](start_span)if (history.size() > 6) history.remove(0);[span_107](end_span)
    }

    private String buildSystemPrompt(String npcName, String playerName) {
        [span_108](start_span)StringBuilder sb = new StringBuilder();[span_108](end_span)
        [span_109](start_span)sb.append("You are ").append(npcName).append(", an AI companion.\n");[span_109](end_span)
        [span_110](start_span)sb.append("Talking to ").append(playerName).append(".\n");[span_110](end_span)
        [span_111](start_span)sb.append("Recent conversation:\n");[span_111](end_span)
        [span_112](start_span)if (history.isEmpty()) sb.append("(none)\n");[span_112](end_span)
        [span_113](start_span)else history.forEach(line -> sb.append(line).append("\n"));[span_113](end_span)
        [span_114](start_span)sb.append("\nRespond ONLY in JSON:\n");[span_114](end_span)
        [span_115](start_span)sb.append("{\"action\":\"say\",\"message\":\"text\"}\n");[span_115](end_span)
        [span_116](start_span)sb.append("{\"action\":\"walk_to\",\"x\":0,\"y\":0,\"z\":0}\n");[span_116](end_span)
        [span_117](start_span)sb.append("{\"action\":\"look_at_player\"}\n");[span_117](end_span)
        [span_118](start_span)return sb.toString();[span_118](end_span)
    }

    private void send(Runnable r) {
        [span_119](start_span)Bukkit.getScheduler().runTask(this, r);[span_119](end_span)
    }
    }
            
