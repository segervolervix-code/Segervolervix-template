import Foundation

struct ChatRequest: Encodable {
    let user_message: String
}

struct ChatResponse: Decodable {
    let ai_message: String
}
