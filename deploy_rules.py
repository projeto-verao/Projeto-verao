#!/usr/bin/env python3
"""
Script para fazer deploy das regras do Firestore via Firebase Management REST API.
Usa o service account para autenticação.
"""
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PROJECT_ID = "projeto-verao-3a6a1"
RULES_FILE = "firestore.rules"

# Carregar credenciais
creds = service_account.Credentials.from_service_account_file(
    "service-account.json",
    scopes=["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"]
)
creds.refresh(Request())
token = creds.token
print(f"[+] Token obtido: {token[:30]}...")

# Ler as regras
with open(RULES_FILE, "r") as f:
    rules_content = f.read()

print(f"[+] Regras carregadas ({len(rules_content)} chars)")

# Criar um novo ruleset via Firebase Rules API
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}

# 1. Criar o ruleset
ruleset_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/rulesets"
ruleset_body = {
    "source": {
        "files": [
            {
                "name": "firestore.rules",
                "content": rules_content,
                "fingerprint": ""
            }
        ]
    }
}

print(f"[+] Criando ruleset...")
resp = requests.post(ruleset_url, headers=headers, json=ruleset_body)
print(f"    Status: {resp.status_code}")
if resp.status_code not in (200, 201):
    print(f"    Erro: {resp.text}")
    exit(1)

ruleset_data = resp.json()
ruleset_name = ruleset_data.get("name")
print(f"[+] Ruleset criado: {ruleset_name}")

# 2. Atualizar o release para apontar para o novo ruleset
release_url = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases/cloud.firestore"
release_body = {
    "release": {
        "name": f"projects/{PROJECT_ID}/releases/cloud.firestore",
        "rulesetName": ruleset_name,
    }
}

print(f"[+] Atualizando release...")
resp = requests.patch(release_url, headers=headers, json=release_body)
print(f"    Status: {resp.status_code}")
if resp.status_code not in (200, 201):
    print(f"    Erro: {resp.text}")
    # Tentar criar o release se não existir
    print(f"[+] Tentando criar release...")
    resp2 = requests.post(
        f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases",
        headers=headers,
        json=release_body
    )
    print(f"    Status: {resp2.status_code}")
    if resp2.status_code not in (200, 201):
        print(f"    Erro: {resp2.text}")
        exit(1)
    print(f"[+] Release criado com sucesso!")
else:
    print(f"[+] Release atualizado com sucesso!")

print("\n[✓] Deploy das regras do Firestore concluído!")
