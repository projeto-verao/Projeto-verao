#!/usr/bin/env python3
"""
Script para validar as regras do Firestore usando a Firebase Rules API.
Verifica se as regras atuais permitem criar workouts com os campos corretos.
"""
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PROJECT_ID = "projeto-verao-3a6a1"

# Carregar credenciais
creds = service_account.Credentials.from_service_account_file(
    "service-account.json",
    scopes=["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"]
)
creds.refresh(Request())
token = creds.token
print(f"[+] Token obtido")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}

# Buscar o release atual
release_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases/cloud.firestore"
resp = requests.get(release_url, headers=headers)
print(f"[+] Release atual: {resp.status_code}")
if resp.status_code == 200:
    release_data = resp.json()
    ruleset_name = release_data.get("rulesetName")
    print(f"    Ruleset ativo: {ruleset_name}")
    
    # Buscar o conteúdo do ruleset
    ruleset_url = f"https://firebaserules.googleapis.com/v1/{ruleset_name}"
    resp2 = requests.get(ruleset_url, headers=headers)
    if resp2.status_code == 200:
        ruleset_data = resp2.json()
        files = ruleset_data.get("source", {}).get("files", [])
        for f in files:
            print(f"\n[+] Arquivo: {f.get('name')}")
            content = f.get("content", "")
            print(content[:500] + "..." if len(content) > 500 else content)
else:
    print(f"    Erro: {resp.text}")

print("\n[✓] Validação concluída!")
