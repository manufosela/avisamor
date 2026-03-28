---
name: No AI attribution in commits
description: Git hook blocks Co-Authored-By or AI references in commit messages
type: feedback
---

NUNCA incluir "Co-Authored-By" ni referencias a IA/Claude en mensajes de commit.
Hay un pre-commit hook que rechaza el commit si detecta atribución a IA.

**Why:** Política del proyecto enforced por hook.
**How to apply:** Omitir siempre la línea Co-Authored-By en todos los commits de este usuario.
