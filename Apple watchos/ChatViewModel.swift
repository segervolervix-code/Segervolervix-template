import Foundation

class ChatViewModel: ObservableObject {
    @Published var responseText: String = "How can I help you?"
    @Published var isLoading: Bool = false
    
    private let apiKey = "Bearer YOUR_API_KEY"
    private let url = URL(string: "https://segervolervix.space/api/chat")!

    func sendMessage(_ message: String) {
        guard !message.isEmpty else { return }
        
        isLoading = true
        responseText = "Thinking..."

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue(apiKey, forHTTPHeaderField: "Authorization")
        
        let body = ChatRequest(user_message: message)
        request.httpBody = try? JSONEncoder().encode(body)

        URLSession.shared.dataTask(with: request) { data, _, error in
            DispatchQueue.main.async {
                self.isLoading = false
                if let data = data, let decodedResponse = try? JSONDecoder().decode(ChatResponse.self, from: data) {
                    self.responseText = decodedResponse.ai_message
                } else {
                    self.responseText = "Error: \(error?.localizedDescription ?? "Unknown error")"
                }
            }
        }.resume()
    }
}
