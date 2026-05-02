package com.example.tvaichat

import android.os.Bundle
import android.widget.*
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

class MainActivity : FragmentActivity() { // Use FragmentActivity for TV

    private val API_URL = "https://segervolervix.space/api/"
    private val API_KEY = "Bearer YOUR_API_KEY"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val input = findViewById<EditText>(R.id.tv_input)
        val sendBtn = findViewById<Button>(R.id.btn_send)
        val output = findViewById<TextView>(R.id.tv_output)

        val retrofit = Retrofit.Builder()
            .baseUrl(API_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TVApi::class.java)

        sendBtn.setOnClickListener {
            val query = input.text.toString()
            if (query.isEmpty()) return@setOnClickListener

            output.text = "AI is thinking..."
            
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val response = retrofit.getAIResponse(API_KEY, ChatRequest(query))
                    withContext(Dispatchers.Main) {
                        output.text = response.ai_message
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        output.text = "Connection Error: ${e.message}"
                    }
                }
            }
        }
    }
}

interface TVApi {
    @POST("chat")
    suspend fun getAIResponse(
        @Header("Authorization") auth: String,
        @Body body: ChatRequest
    ): ChatResponse
}
