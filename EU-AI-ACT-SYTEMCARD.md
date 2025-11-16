# EU AI Act – System Card  
for the condata AAI-Chatbot  
Version 1.0 – © condata / Konstantin Milonas

Diese System Card beschreibt das KI-System „condata AAI-Chatbot“ gemäß den Transparenz- und Dokumentationsanforderungen des EU AI Act (Limited-Risk Systeme).

---

# 1. Systemübersicht

## 1.1. Systemname
**condata AAI-Chatbot**

## 1.2. Systemtyp nach EU AI Act
**Low-/Limited-Risk AI System** gemäß Kapitel IV des EU AI Act.

Das System ist nicht:
- Hochrisiko-KI  
- Unzulässige KI  
- Biometrische KI  
- Kritische Infrastruktur-KI  

## 1.3. Verantwortlicher Anbieter
condata / Konstantin Milonas  
[Adresse einfügen]  
[E-Mail einfügen]

## 1.4. Zweck des Systems
Der condata AAI-Chatbot dient der:
- Bereitstellung von Unternehmensinformationen  
- Beantwortung von Nutzeranfragen (Text/Voice)  
- Analyse und Qualifizierung von geschäftlichen Anliegen  
- Buchung, Änderung oder Absage von Terminen  
- Lead-Generierung und Vorqualifizierung  
- Automatisierten Beratung anhand hinterlegter Wissensdaten (Vectorize)

---

# 2. Architektur & Komponenten

## 2.1. Hauptkomponenten
- **OpenAI Realtime API (Speech/LLM)**
- **Cloudflare Worker (Secure Proxy Layer)**
- **Cloudflare Vectorize (Wissensdatenbank)**
- **Cloudflare Pages/HTML Widget (Client-Interface)**
- **HubSpot CRM (optional: Terminbuchung & Leads)**

## 2.2. Datenfluss (vereinfachtes Modell)

Nutzer → Browser (Widget)
→ Cloudflare Worker (Proxy)
→ OpenAI Realtime API (Verarbeitung)
→ Cloudflare Vectorize (Unternehmenswissen)
→ HubSpot (optional: Termine/Kontakte)


Der Worker fungiert als Sicherheitsgrenze – keine API Keys im Client.

---

# 3. Art der KI-Funktionen

## 3.1. Verwendete Fähigkeiten
- Sprachverarbeitung (Speech-to-Text / Text-to-Speech)  
- Natürlichsprachliche Texteingabe  
- Dialogmanagement  
- Semantische Vektor-Suche  
- Inhalts- und Anfragen-Analyse  
- Termin & CRM-Automatisierung (tool-based)

## 3.2. Modellspezifikationen
- **Modellfamilie:** OpenAI GPT-4o-mini-realtime  
- **Bereitstellungsform:** API-invocation  
- **Speicherung der Daten im Modell:** keine (kein Training)  
- **Laufzeit:** generativ, nicht persistent  

---

# 4. Datenverarbeitung

## 4.1. Arten verarbeiteter Daten
- Textinhalte  
- Audio-Input  
- Gesprächsereignisse (Events)  
- Kontaktinformationen (optional)  
- Terminwünsche (optional)  
- unternehmensbezogene Wissensdaten in Embeddings (nicht personenbezogen)

## 4.2. Speicherung personenbezogener Daten
**Der Anbieter speichert keine personenbezogenen Daten.**

Personenbezogene Daten werden ausschließlich verarbeitet durch:
- **HubSpot** (CRM, Termine)  
- **Cloudflare** (ultrakurzlebige technische Logs)  
- **OpenAI** (temporäre Verarbeitung)

## 4.3. Datenminimierung
- keine Speicherung von Chat-Inhalten im Worker  
- keine Speicherung von Audio/Transkripten  
- CRM-Daten nur nach bewusster Angabe des Nutzers  
- Embeddings enthalten *keine personenbezogenen Daten*

---

# 5. Zielgruppen & Einsatzbereich

## 5.1. Zielgruppe
Unternehmen in Deutschland, Österreich und der Schweiz (DACH).

## 5.2. Nutzungszweck
- Kundenservice  
- Information  
- Lead-Generierung  
- Beratung  
- Terminvereinbarung  

## 5.3. Nicht geeignet für
- kritische Infrastruktur  
- rechtlich verbindliche Entscheidungen  
- medizinische Diagnose  
- Finanzprüfungen  
- Verarbeitung sensibler personenbezogener Daten (Art. 9 DSGVO)

---

# 6. Benutzerinteraktion & Transparenz

## 6.1. Kennzeichnung als KI
Das System informiert Nutzer klar:
- „Dieses Assistenzsystem nutzt KI, um Antworten zu generieren.“

## 6.2. Möglichkeit menschlicher Eskalation
Nutzer können jederzeit:
- Kontaktaufnahme wünschen („Mit einem Menschen sprechen“)  
- Telefontermin buchen  
- E-Mail-Kontakt anfordern  

## 6.3. Nutzerkontrolle
Der Nutzer kann:
- Sprache oder Text frei wechseln  
- Datenangabe verweigern  
- Einwilligungen jederzeit widerrufen  

---

# 7. Risiken & Risikominderung

## 7.1. Identifizierte Risiken
- Falschinformationen („hallucinations“)  
- Missverständnisse bei komplexen Beschreibungen  
- fehlerhafte Termininterpretationen  
- Übermittlung sensibler Daten durch Nutzer  
- unabsichtliche Speicherung von Daten in CRM-Systemen

## 7.2. Maßnahmen zur Risikominderung
- KI wird klar als KI gekennzeichnet  
- Nutzer wird auf verantwortliche Nutzung hingewiesen  
- keine automatisierte Entscheidungsfindung mit Außenwirkung  
- Validierung beim Termin- oder Datenerhalt  
- keine Embeddings personenbezogener Daten  
- Worker blockiert API Key Leakage  
- Logging auf Minimum reduziert  
- regelmäßige Contentrichtlinienprüfung  

---

# 8. Datenquellen

## 8.1. Interne Wissensbasis
Unternehmensdokumente:
- Leistungsbeschreibungen  
- FAQs  
- Prozessinformationen  
- Marketinginhalte  

Diese werden in **Cloudflare Vectorize** in Vektoren umgewandelt.

## 8.2. Nutzereingaben
Nur Daten, die der Nutzer aktiv eingibt.

---

# 9. Monitoring & Evaluation

## 9.1. Qualitätskontrollen
- manuelle Auswertung typischer Dialoge  
- Monitoring von Fehlerraten (Tool-Errors)

## 9.2. Technisches Monitoring
- Uptime  
- Latenzzeiten  
- Fehlerprotokolle (anonymisiert)  
- Sicherheitsereignisse (Cloudflare Firewall)

---

# 10. Systemgrenzen

### Das System:
- trifft **keine rechtlich bindenden Entscheidungen**  
- gibt **keine medizinischen, rechtlichen oder finanziellen Gutachten**  
- bewertet oder klassifiziert Nutzer nicht  
- speichert keine personenbezogenen Daten im Modell  
- garantiert nicht die absolute Richtigkeit jeder Antwort

---

# 11. Kontakt

Für Rückfragen:
condata / Konstantin Milonas  
[E-Mail einsetzen]  
[Adresse einsetzen]

---

**© condata / Konstantin Milonas**

