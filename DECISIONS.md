# Locked Decisions

## Entry
- QR = table-bound only
- auto match session
- fallback = 4-digit code

## Session
- 1 OPEN per branch
- auto close 12h
- manual close allowed

## Participation
- intro required
- late entry always allowed
- no waiting
- reservation grants eligibility only (not participant creation)
- participant is created only after QR check-in on Mingle server

## External Boundary
- website handles entry guidance/reservation context only
- website/reservation system never creates participant directly
- reservation lookup rule: reservationExternalId first, normalized phone fallback

## Table
- belongs to branch
- fixed QR
- subset used per session

## Admin
- move allowed
- no reason required
- BUT must log

## Content
- global library
- session ON/OFF
- no push

## Philosophy
System supports operator.