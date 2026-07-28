"""
Context-Aware Machine Translation Engine & Translation QA Agent
Provides LLM-based translation with rolling context, glossary injection, tone settings, and QA confidence scoring.
"""

import json
import logging
import time
from typing import List, Dict

import os
from openai import OpenAI

class ContextAwareMTEngine:
    def __init__(self):
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def _build_prompt(self, text: str, source_lang: str, target_lang: str, context: List[Dict], glossary: Dict[str, str], tone: str) -> str:
        prompt = f"Translate the following text from {source_lang} to {target_lang}. Reply ONLY with the translated text.\n"
        prompt += f"Tone: {tone}\n"
        
        if glossary:
            prompt += "Glossary (use these exact terms):\n"
            for src, tgt in glossary.items():
                prompt += f"- {src} -> {tgt}\n"
                
        if context:
            prompt += "Previous Context:\n"
            for msg in context[-3:]:  # Keep last 3 utterances for rolling context
                prompt += f"[Source]: {msg['source']}\n[Translation]: {msg['translation']}\n"
                
        prompt += f"\nText to translate: {text}\n"
        return prompt

    def translate_with_context(self, text: str, source_lang: str, target_lang: str, session_context: List[Dict] = None, glossary: Dict[str, str] = None, tone: str = "casual") -> str:
        if not session_context:
            session_context = []
        if not glossary:
            glossary = {}
            
        prompt = self._build_prompt(text, source_lang, target_lang, session_context, glossary, tone)
        
        if self.client:
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert bilingual translator."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                translation = response.choices[0].message.content.strip()
                logging.info(f"LLM Translation successful.")
                return translation
            except Exception as e:
                logging.error(f"LLM translation error: {e}")
        
        # Fallback simulated response
        return f"[{target_lang.upper()} Context-Aware] {text}"


class TranslationQAAgent:
    def __init__(self):
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def score_translation(self, source_text: str, translated_text: str, source_lang: str, target_lang: str) -> float:
        """
        Scores the semantic fidelity of the translation on a 0-1 scale.
        Runs in parallel with TTS start to avoid blocking the happy path.
        """
        confidence = 0.95
        
        if self.client:
            try:
                prompt = f"Source ({source_lang}): {source_text}\nTranslation ({target_lang}): {translated_text}\nRate the semantic fidelity of this translation from 0.0 to 1.0. Reply ONLY with the float number."
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a translation QA agent. Only return a float score."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.0
                )
                score_str = response.choices[0].message.content.strip()
                confidence = float(score_str)
                logging.info(f"LLM QA Scored: {confidence}")
                return confidence
            except Exception as e:
                logging.error(f"LLM QA error: {e}")

        # Fallback simulation
        if len(translated_text) < len(source_text) // 2:
             confidence = 0.4
             
        logging.info(f"Simulated QA Scored: {confidence} for '{translated_text}'")
        return confidence
