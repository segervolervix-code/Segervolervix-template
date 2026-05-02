import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = ChatViewModel()
    @State private var userInput: String = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Watch AI")
                    .font(.caption)
                    .foregroundColor(.blue)

                TextField("Type message...", text: $userInput)
                    .submitLabel(.send)
                    .onSubmit {
                        viewModel.sendMessage(userInput)
                        userInput = "" 
                    }

                Divider()

                if viewModel.isLoading {
                    ProgressView()
                } else {
                    Text(viewModel.responseText)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
        }
    }
}
