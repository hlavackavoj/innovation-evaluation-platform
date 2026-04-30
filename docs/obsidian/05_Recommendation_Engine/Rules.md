# Rules

Kompletní seznam pravidel tak, jak jsou implementována v `lib/recommendations.ts`.

## Stage-based pravidla (2 pravidla na každou fázi)

### DISCOVERY

**ruleKey:** `stage:discovery:market-size`
- title: Perform market size analysis
- suggestedRole: Industry expert

**ruleKey:** `stage:discovery:target-audience`
- title: Identify primary target audience
- suggestedRole: Startup mentor

---

### VALIDATION

**ruleKey:** `stage:validation:interviews`
- title: Conduct 10 stakeholder interviews
- suggestedRole: Startup mentor

**ruleKey:** `stage:validation:mvp-scope`
- title: Draft MVP feature list
- suggestedRole: Evaluator

---

### MVP

**ruleKey:** `stage:mvp:analytics`
- title: Set up analytics tracking
- suggestedRole: Technical lead

**ruleKey:** `stage:mvp:success-metrics`
- title: Define success metrics for pilot
- suggestedRole: Product lead

---

### SCALING

**ruleKey:** `stage:scaling:business-development`
- title: Build partnership pipeline
- suggestedRole: Business Developer

**ruleKey:** `stage:scaling:investor-readiness`
- title: Prepare investor readiness materials
- suggestedRole: Investor

---

### SPIN_OFF

**ruleKey:** `stage:spin-off:company-roadmap`
- title: Formalize spin-off roadmap
- suggestedRole: Technology transfer officer

**ruleKey:** `stage:spin-off:ip-transfer`
- title: Confirm legal and IP transfer plan
- suggestedRole: IP lawyer

---

## Condition-based pravidla

### Chybí IP status

**ruleKey:** `condition:missing-ip-status`
- Podmínka: `ipStatus` je prázdný nebo null
- title: Clarify IP status
- suggestedRole: IP lawyer

---

### Slabá business kompetence

**ruleKey:** `condition:business-capability-gap`
- Podmínka: `teamStrength === TECHNICAL_ONLY` nebo `businessReadiness === WEAK`
- title: Strengthen business capability
- suggestedRole: Business mentor

---

### Chybí další krok

**ruleKey:** `condition:missing-next-step`
- Podmínka: `nextStep` je prázdný nebo null
- title: Define the next milestone
- suggestedRole: Project manager

---

### Stale contact (>30 dní bez kontaktu)

**ruleKey:** `condition:stale-contact`
- Podmínka: `lastContactAt` je starší než 30 dní
- title: Reconnect with the project team
- suggestedRole: Project manager

---

### Vysoký potenciál bez support plánu

**ruleKey:** `condition:high-potential-support-plan`
- Podmínka: `potentialLevel === HIGH` AND `stage` není SCALING nebo SPIN_OFF
- title: Prepare a support plan
- suggestedRole: Innovation manager
