package com.example.wearaichat

import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

class MainActivity : AppCompatActivity() {

    private val CHAT_URL = "https://segervolervix.space/api/"
    private val API_KEY = "Bearer YOUR_API_KEY" // Replace with your actual key

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val input = findViewById<EditText>(R.id.input)
        val send = findViewById<ImageButton>(R.id.send)
        val output = findViewById<TextView>(R.id.output)

        val api = Retrofit.Builder()
            .baseUrl(CHAT_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(Api::class.java)

        send.setOnClickListener {
            val message = input.text.toString()
            if (message.isBlank()) return@setOnClickListener

            output.text = "Thinking..."
            input.setText("") // Clear input for small screen

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val response = api.chat(API_KEY, ChatRequest(message))

                    withContext(Dispatchers.Main) {
                        output.text = response.ai_message
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        output.text = "Error: ${e.message}"
                    }
                }
            }
        }
    }
}

/* ---------------- API DATA MODELS ---------------- */

data class ChatRequest(val user_message: String)
data class ChatResponse(val ai_message: String)

interface Api {
    @POST("chat")
    suspend fun chat(
        @Header("Authorization") key: String,
        @Body body: ChatRequest
    ): ChatResponse
}
