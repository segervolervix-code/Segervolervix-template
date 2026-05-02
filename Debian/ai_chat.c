#include <gtk/gtk.h>
#include <curl/curl.h>
#include <json-glib/json-glib.h>
#include <string.h>
#include <stdlib.h>

#define CHAT_URL "https://segervolervix.space/api/chat"
#define API_KEY "YOUR_API_KEY"

/* UI widgets */
GtkWidget *entry;
GtkWidget *label;

/* memory for API response */
struct Memory {
    char *data;
    size_t size;
};

static size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct Memory *mem = (struct Memory *)userp;

    char *ptr = realloc(mem->data, mem->size + realsize + 1);
    if (!ptr) return 0;

    mem->data = ptr;
    memcpy(&(mem->data[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->data[mem->size] = 0;

    return realsize;
}

static void send_message(GtkWidget *widget, gpointer data) {
    const char *text = gtk_editable_get_text(GTK_EDITABLE(entry));
    if (!text || strlen(text) == 0) return;

    CURL *curl = curl_easy_init();
    struct curl_slist *headers = NULL;

    struct Memory chunk;
    chunk.data = malloc(1);
    chunk.size = 0;

    if (curl) {
        char json_data[1024];
        snprintf(json_data, sizeof(json_data),
                 "{\"user_message\":\"%s\"}", text);

        char auth_header[256];
        snprintf(auth_header, sizeof(auth_header),
                 "Authorization: Bearer %s", API_KEY);

        headers = curl_slist_append(headers, "Content-Type: application/json");
        headers = curl_slist_append(headers, auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, CHAT_URL);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_data);

        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);

        CURLcode res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            JsonParser *parser = json_parser_new();

            if (json_parser_load_from_data(parser, chunk.data, -1, NULL)) {
                JsonNode *root = json_parser_get_root(parser);
                JsonObject *obj = json_node_get_object(root);

                const char *ai_message =
                    json_object_get_string_member(obj, "ai_message");

                gtk_label_set_text(GTK_LABEL(label),
                    ai_message ? ai_message : "No response");
            } else {
                gtk_label_set_text(GTK_LABEL(label), "JSON parse error");
            }

            g_object_unref(parser);
        } else {
            gtk_label_set_text(GTK_LABEL(label), "Request failed");
        }

        free(chunk.data);
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
    }
}

static void activate(GtkApplication *app, gpointer user_data) {
    GtkWidget *window = gtk_application_window_new(app);
    gtk_window_set_title(GTK_WINDOW(window), "AI Chat");
    gtk_window_set_default_size(GTK_WINDOW(window), 400, 300);

    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 10);
    gtk_window_set_child(GTK_WINDOW(window), box);

    entry = gtk_entry_new();
    gtk_box_append(GTK_BOX(box), entry);

    GtkWidget *button = gtk_button_new_with_label("Send");
    gtk_box_append(GTK_BOX(box), button);

    label = gtk_label_new("Response will appear here");
    gtk_box_append(GTK_BOX(box), label);

    g_signal_connect(button, "clicked", G_CALLBACK(send_message), NULL);

    gtk_window_present(window);
}

int main(int argc, char **argv) {
    GtkApplication *app;
    int status;

    app = gtk_application_new("com.aichat.debian", G_APPLICATION_DEFAULT_FLAGS);
    g_signal_connect(app, "activate", G_CALLBACK(activate), NULL);

    status = g_application_run(G_APPLICATION(app), argc, argv);
    g_object_unref(app);

    return status;
}
