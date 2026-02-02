'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type Playlist = Database['public']['Tables']['playlists']['Row']
type Track = Database['public']['Tables']['tracks']['Row']

interface SongSuggestion {
  title: string
  artist: string
  reason?: string
}

interface AISuggestionResponse {
  suggestions: SongSuggestion[]
  userMessage: string
}

/**
 * Calls Google Gemini API to suggest 5-10 songs based on playlist vibe and user request
 */
export async function getSongSuggestionsFromAI(
  playlist: Playlist,
  userRequest: string,
  existingTracks: Track[]
): Promise<AISuggestionResponse> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured')
  }

  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: 'gemini-2.5-pro' })

  // Build context about existing tracks
  const existingTracksList = existingTracks
    .slice(0, 20) // Include first 20 for context
    .map(t => `${t.title} by ${t.artist}`)
    .join('\n')

  const systemPrompt = `You are a music DJ helping curate a wedding playlist. Your role is to suggest 5-10 songs that would fit the playlist vibe and user request.

Playlist Information:
- Title: ${playlist.title}
- Vibe: ${playlist.vibe || 'Not specified'}
- Description: ${playlist.description || 'No description'}

Existing Songs (do NOT suggest these):
${existingTracksList || 'No existing songs'}

User Request: ${userRequest}

Please suggest 5-10 songs that:
1. Match the playlist's vibe and theme
2. Are NOT already in the playlist
3. Fulfill the user's request
4. Are appropriate for a wedding

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "suggestions": [
    {"title": "Song Title", "artist": "Artist Name", "reason": "Why this fits"},
    ...
  ],
  "message": "A brief response to the user about the suggestions"
}

If you cannot generate suggestions, respond with:
{
  "suggestions": [],
  "message": "I couldn't find suitable suggestions for your request. Please try again."
}`

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
      ],
    })

    const responseText = result.response.text()
    
    // Try to parse the JSON response
    let parsedResponse
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText, parseError)
      // Return empty suggestions if parsing fails
      return {
        suggestions: [],
        userMessage: 'I had trouble processing that request. Please try again.',
      }
    }

    // Validate response structure
    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error('Invalid response format')
    }

    return {
      suggestions: parsedResponse.suggestions,
      userMessage: parsedResponse.message || 'Here are my suggestions!',
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    
    // Handle specific Gemini API errors with user-friendly messages
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        throw new Error('The AI service is currently busy. Please try again in a few minutes.')
      }
      
      if (errorMessage.includes('token') || errorMessage.includes('usage')) {
        throw new Error('The AI service has reached its daily limit. Please try again tomorrow.')
      }
      
      if (errorMessage.includes('authentication') || errorMessage.includes('api key')) {
        throw new Error('There is a configuration issue with the AI service. Please contact support.')
      }
      
      if (errorMessage.includes('not found') || errorMessage.includes('model')) {
        throw new Error('The AI service is temporarily unavailable. Please try again later.')
      }
    }
    
    throw new Error('The AI service is having trouble right now. Please try again in a moment.')
  }
}
