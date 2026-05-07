import SwiftUI

struct ContentView: View {

    @State private var message: String = ""
    @State private var response: String = ""
    @State private var isLoading: Bool = false

    // Configuration for the Segervolervix API
    let CHAT_URL = "https://segervolervix.space/api/chat"
    let API_KEY = "YOUR_API_KEY" // Replace with your actual key

    var body: some View {
        VStack(spacing: 16) {
            // Header for the macOS window
            Text("NergeAI Desktop")
                .font(.headline)
                .padding(.top)

            // Input Area
            TextField("Type your message here...", text: $message)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .onSubmit { // Allows pressing "Enter" to send
                    sendMessage()
                }
                .padding(.horizontal)

            // Action Button
            Button(action: sendMessage) {
                if isLoading {
                    ProgressView()
                        .controlSize(.small)
                } else {
                    Text("Send Message")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading || message.isEmpty)
            .padding(.horizontal)

            // AI Response Display
            ScrollView {
                VStack(alignment: .leading) {
                    if !response.isEmpty {
                        Text(response)
                            .padding()
                            .textSelection(.enabled) // Essential for desktop copy/paste
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.secondary.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }
            .padding()

            Spacer()
        }
        .frame(minWidth: 400, minHeight: 500) // Optimal default size for macOS
    }

    func sendMessage() {
        guard !message.isEmpty else { return }

        isLoading = true
        response = "Thinking..."

        guard let url = URL(string: CHAT_URL) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(API_KEY)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        // Constructing the payload based on segervolervix requirements
        let body: [String: Any] = [
            "user_message": message,
            "ai_model": "nergeenolix"
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, error in
            DispatchQueue.main.async {
                isLoading = false
                
                if let error = error {
                    response = "Error: \(error.localizedDescription)"
                    return
                }

                guard let data = data else {
                    response = "Error: No data received."
                    return
                }

                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let aiMessage = json["ai_message"] as? String {
                        response = aiMessage
                    } else {
                        response = "Invalid response format from server."
                    }
                } catch {
                    response = "Failed to parse API response."
                }
            }
        }.resume()
    }
}

