            package com.example.aichat

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class MainActivity : AppCompatActivity() {

    private val CHAT_URL = "https://segervolervix.space/api/"
    private val API_KEY = "Bearer YOUR_API_KEY"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val chatContainer = findViewById<View>(R.id.chat_container)
        val errorLayout = findViewById<View>(R.id.error_layout)
        val retryBtn = findViewById<Button>(R.id.retry_btn)
        val input = findViewById<EditText>(R.id.input)
        val send = findViewById<Button>(R.id.send)
        val output = findViewById<TextView>(R.id.output)

        // Initialize API
        val api = Retrofit.Builder()
            .baseUrl(CHAT_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(Api::class.java)

        // Connectivity Check Function
        fun checkConnection() {
            if (isNetworkAvailable()) {
                chatContainer.visibility = View.VISIBLE
                errorLayout.visibility = View.GONE
            } else {
                chatContainer.visibility = View.GONE
                errorLayout.visibility = View.VISIBLE
            }
        }

        // Initial check
        checkConnection()

        retryBtn.setOnClickListener { checkConnection() }

        send.setOnClickListener {
            if (!isNetworkAvailable()) {
                checkConnection()
                return@setOnClickListener
            }

            val message = input.text.toString()
            if (message.isBlank()) return@setOnClickListener

            output.text = "Thinking..."

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

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
