import SwiftUI

struct ContentView: View {

    @State private var message: String = ""
    @State private var response: String = ""
    @State private var isLoading: Bool = false

    let CHAT_URL = "https://segervolervix.space/api/chat"
    let API_KEY = "YOUR_API_KEY"

    var body: some View {
        VStack(spacing: 16) {

            TextField("Type message...", text: $message)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding()

            Button(action: sendMessage) {
                Text(isLoading ? "Sending..." : "Send")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .disabled(isLoading)

            ScrollView {
                Text(response)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Spacer()
        }
        .padding()
    }

    func sendMessage() {
        guard !message.isEmpty else { return }

        isLoading = true
        response = "..."

        guard let url = URL(string: CHAT_URL) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(API_KEY)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "user_message": message
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, error in

            DispatchQueue.main.async {
                isLoading = false
            }

            if let error = error {
                DispatchQueue.main.async {
                    response = "Error: \(error.localizedDescription)"
                }
                return
            }

            guard let data = data else { return }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let aiMessage = json["ai_message"] as? String {

                    DispatchQueue.main.async {
                        response = aiMessage
                    }
                } else {
                    DispatchQueue.main.async {
                        response = "Invalid response format"
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    response = "Parsing error"
                }
            }

        }.resume()
    }
}
