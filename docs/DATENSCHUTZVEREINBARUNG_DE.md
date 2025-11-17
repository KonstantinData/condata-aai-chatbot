# Datenschutzvereinbarung (DSGVO)
für den condata AAI-Chatbot  
Version 1.0 – © condata / Konstantin Milonas

Diese Datenschutzvereinbarung regelt die Verarbeitung personenbezogener Daten im Rahmen der Nutzung des condata AAI-Chatbots („Dienst“) durch Unternehmen („Kunde“) gemäß der Datenschutz-Grundverordnung (DSGVO).

---

# 1. Rollen und Verantwortlichkeiten

## 1.1. Anbieter als Auftragsverarbeiter
Der Anbieter (condata / Konstantin Milonas) verarbeitet personenbezogene Daten ausschließlich im Auftrag des Kunden und nach dessen dokumentierten Weisungen.

## 1.2. Kunde als Verantwortlicher
Der Kunde ist datenschutzrechtlich Verantwortlicher im Sinne von Art. 4 Nr. 7 DSGVO für alle personenbezogenen Daten, die über den Dienst verarbeitet werden.

## 1.3. Unterauftragnehmer
Der Anbieter setzt folgende Subprozessoren ein:

1. **OpenAI (USA/EU)**  
   – Verarbeitung von Text- und Audioinhalten (Realtime API)

2. **Cloudflare Inc. (weltweit, inkl. EU-Rechenzentren)**  
   – Hosting, Edge-Compute, Vectorize, Worker-Umgebung

3. **HubSpot (USA/EU)**  
   – CRM, Termin- und Kontaktverwaltung

Diese Subprozessoren sind durch Verträge (DPAs) gemäß Art. 28 DSGVO abgesichert.

---

# 2. Art der verarbeiteten Daten

## 2.1. Kategorien personenbezogener Daten
Je nach Nutzung können verarbeitet werden:

- Name, Vorname  
- Telefonnummer, E-Mail-Adresse  
- Unternehmenszugehörigkeit  
- Termininformationen  
- Inhalte aus Texteingaben  
- Inhalte aus Spracheingaben  
- technische Metadaten (z. B. Zeitstempel, Session-IDs)

## 2.2. Besondere Kategorien
Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) werden **nicht aktiv verlangt**.  
Falls Nutzer solche Daten freiwillig eingeben, erfolgt die Verarbeitung ausschließlich zur Anfragebearbeitung.

---

# 3. Zwecke der Verarbeitung

Daten werden für folgende Zwecke verarbeitet:

1. **Beantwortung von Nutzeranfragen (Text/Voice)**  
2. **Bereitstellung von Unternehmensinformationen**  
3. **Qualifizierung von Anfragen**  
4. **Terminbuchung, -änderung, -absage**  
5. **Erstellung und Verwaltung von CRM-Einträgen**  
6. **Versand von Bestätigungsnachrichten (E-Mail/WhatsApp)**  
7. **Bereitstellung, Betrieb und Optimierung des Dienstes**

Datenverarbeitung erfolgt **nur im Auftrag des Kunden**.

---

# 4. Rechtsgrundlagen

Die Verarbeitung stützt sich insbesondere auf:

- **Art. 6 Abs. 1 lit. b DSGVO** — Vertragserfüllung  
- **Art. 6 Abs. 1 lit. f DSGVO** — berechtigtes Interesse (technischer Betrieb)  
- **Art. 6 Abs. 1 lit. a DSGVO** — Einwilligung (Terminbuchung, Kontaktdaten)

Der Kunde ist verpflichtet, eine rechtskonforme Grundlage für die Eingabe personenbezogener Daten sicherzustellen.

---

# 5. Speicherorte & Datenübermittlung

## 5.1. Speicherung durch den Anbieter
Der Anbieter speichert **keine personenbezogenen Daten dauerhaft** innerhalb seiner Systeme.  
Verarbeitung erfolgt transient in Cloudflare Worker-Instanzen.

## 5.2. Speicherung durch Subprozessoren
- **HubSpot** speichert CRM- und Termin-Daten  
- **Cloudflare** speichert technische Daten & Embeddings (nur Unternehmensinhalte)  
- **OpenAI** speichert Daten temporär zur Ausführung der KI-Funktionen

Der Anbieter stellt sicher, dass alle Subprozessoren:
- DS-GVO-konforme DPAs abgeschlossen haben  
- Daten nur für die vereinbarten Zwecke verarbeiten  

---

# 6. Datenminimierung

Der Anbieter minimiert personenbezogene Daten nach folgenden Grundsätzen:

- keine Speicherung kompletter Gesprächsverläufe ohne Einwilligung  
- keine Speicherung von Audio-/Textdaten über die Anfrage hinaus  
- keine Übertragung sensibler Daten ohne zwingenden Zweck  
- Nutzung von CRM-Daten nur, wenn Nutzer aktiv Termin oder Kontakt wünscht  

Der Kunde verpflichtet sich, möglichst wenige personenbezogene Daten zu übermitteln.

---

# 7. Löschung & Aufbewahrung

## 7.1. Löschung durch den Anbieter
Da der Anbieter keine personenbezogenen Daten speichert, entfällt die Pflicht zur Löschung in eigenen Systemen.

## 7.2. Löschung durch Subprozessoren
- HubSpot: Löschroutinen gemäß Kundenanweisung  
- OpenAI: Verarbeitung ohne dauerhafte Speicherung  
- Cloudflare: technische Daten nach Systemvorgaben

## 7.3. Datenlöschung auf Anweisung
Der Anbieter löscht oder anonymisiert Daten in Unterauftragssystemen auf schriftliche Anweisung des Kunden, sofern technisch möglich.

---

# 8. Technische und organisatorische Maßnahmen (TOMs)

Der Anbieter stellt sicher:

- TLS-Verschlüsselung aller Verbindungen  
- API-Keys ausschließlich serverseitig  
- Edge-Compute ohne dauerhafte Logs  
- Zugriffskontrollen & Rollenmodelle  
- Schutz vor unbefugter Verarbeitung  
- sichere Passwörter & MFA  
- Beschränkung der Subprozessoren

---

# 9. Betroffenenrechte

Nutzer können folgende Rechte gegenüber dem Kunden geltend machen:

- Auskunft (Art. 15 DSGVO)  
- Berichtigung (Art. 16 DSGVO)  
- Löschung (Art. 17 DSGVO)  
- Einschränkung (Art. 18 DSGVO)  
- Datenübertragbarkeit (Art. 20 DSGVO)  
- Widerspruch gegen Verarbeitung (Art. 21 DSGVO)

Der Anbieter unterstützt den Kunden bei der Erfüllung dieser Rechte (Art. 28 DSGVO).

---

# 10. Meldepflichten & Datenschutzvorfälle

Der Anbieter informiert den Kunden unverzüglich über Datenschutzverstöße, die personenbezogene Daten betreffen.

Der Kunde ist für Meldungen an Behörden/Betroffene verantwortlich.

---

# 11. KI-Transparenz & EU AI Act

Der condata AAI-Chatbot ist ein **KI-System mit begrenztem Risiko** gemäß EU AI Act.  
Der Anbieter stellt sicher:

- Kennzeichnung als KI  
- Protokollierung relevanter technischen Ereignisse  
- nachvollziehbare Funktionsweise (System Card)  
- keine diskriminierenden oder manipulativen Funktionen  

Der Kunde ist verpflichtet:
- Nutzer transparent zu informieren  
- eine menschliche Alternative anzubieten  

---

# 12. Geheimhaltung

Beide Parteien verpflichten sich zur Vertraulichkeit aller personenbezogenen und geschäftlichen Informationen.

---

# 13. Laufzeit

Diese Datenschutzvereinbarung gilt für die Dauer der Nutzung des Dienstes.

---

# 14. Schlussbestimmungen
Sollte eine Bestimmung unwirksam sein, bleiben die übrigen Bestimmungen unberührt.  
Es gilt deutsches Recht.  
Gerichtsstand ist der Sitz des Anbieters.

---

**© condata / Konstantin Milonas**
