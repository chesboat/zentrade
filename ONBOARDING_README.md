# Rule Setup Onboarding System

## Overview

The Rule Setup Onboarding Questionnaire helps traders define and track their own discipline system. It collects preferences about trading rules, habits, and discipline measures, then saves them to Firestore for use throughout the application.

## Features

- **11-step questionnaire** covering all aspects of trading discipline
- **Progressive form** with visual progress indicator
- **Dynamic suggestions** based on user selections
- **Firestore integration** for persistent storage
- **Utility functions** for accessing and applying rules
- **Modern UI** with Tailwind CSS styling

## Files Created

### Core Components
- `src/components/onboarding/RuleSetupForm.tsx` - Main onboarding form component
- `src/app/onboarding/page.tsx` - Next.js page route for the form
- `src/utils/rulePreferences.ts` - Utility functions for working with preferences

## Form Questions & Data Structure

The form collects the following data and saves it under `users/{uid}/rulePreferences`:

```typescript
interface RulePreferences {
  maxTradesPerDay: number              // Q1: Daily trade limit (1-10)
  stopAfterWin: boolean                // Q2: Stop after first win
  behaviorAfterLoss: "stop" | "break" | "continue" | "prompt"  // Q3: Loss behavior
  session: "london" | "newyork" | "asia" | "custom"          // Q4: Trading session
  requiresConfirmation: boolean        // Q5: Trade confirmation required
  usesChecklist: boolean              // Q6: Pre-trade checklist
  journalReviewFrequency: "daily" | "weekly" | "monthly" | "never"  // Q7: Review frequency
  dailyRemindersEnabled: boolean      // Q8: Daily nudges
  followUpStyle: "summary" | "checklist" | "manual"  // Q9: Daily follow-up style
  wantsSuggestedRules: boolean        // Q10: Want suggested rules
  customRules: string[]               // Q11: Personal rules (includes suggested if selected)
}
```

## Question Details

### 1. Daily Trade Limit (maxTradesPerDay)
- **Type**: Dropdown (1-10)
- **Purpose**: Prevents overtrading
- **Default**: 3

### 2. Stop After Win (stopAfterWin)
- **Type**: Yes/No toggle
- **Purpose**: Preserve profits, avoid overtrading
- **Default**: false

### 3. Behavior After Loss (behaviorAfterLoss)
- **Type**: Radio buttons
- **Options**: 
  - `stop`: End session immediately
  - `break`: Take 15-30 minute break
  - `continue`: Keep trading normally
  - `prompt`: Ask each time
- **Default**: "break"

### 4. Trading Session (session)
- **Type**: Dropdown
- **Options**:
  - `london`: 2:00-11:00 AM EST
  - `newyork`: 8:00 AM-5:00 PM EST
  - `asia`: 7:00 PM-4:00 AM EST
  - `custom`: User-defined
- **Default**: "newyork"

### 5. Trade Confirmation (requiresConfirmation)
- **Type**: Checkbox
- **Purpose**: Prevent impulse trades
- **Default**: false

### 6. Pre-Trade Checklist (usesChecklist)
- **Type**: Checkbox
- **Purpose**: Systematic trade evaluation
- **Default**: false

### 7. Journal Review Frequency (journalReviewFrequency)
- **Type**: Dropdown
- **Options**: daily, weekly, monthly, never
- **Default**: "daily"

### 8. Daily Reminders (dailyRemindersEnabled)
- **Type**: Yes/No toggle
- **Purpose**: Helpful nudges for discipline
- **Default**: true

### 9. Follow-Up Style (followUpStyle)
- **Type**: Radio buttons
- **Options**:
  - `summary`: Single yes/no question
  - `checklist`: Individual rule checks
  - `manual`: Free-form journal entry
- **Default**: "summary"

### 10. Suggested Rules (wantsSuggestedRules)
- **Type**: Yes/No toggle
- **Shows preview** of 8 suggested rules if enabled
- **Rules automatically added** to customRules if selected
- **Default**: false

### 11. Personal Rules (customRules)
- **Type**: Textarea (one rule per line)
- **Combines** with suggested rules if Q10 is "yes"
- **Real-time preview** of parsed rules

## Suggested Rules

When users opt for suggested rules, these 8 rules are automatically added:

1. "Stop trading after one good setup hits TP"
2. "No revenge trades after losses" 
3. "Trade only 8:30–11:30 NY"
4. "Must journal before placing a new trade"
5. "Maximum 3 consecutive losing trades per day"
6. "Take a 15-minute break after each loss"
7. "Only trade A+ setups on high-volume stocks"
8. "Risk management: Never risk more than 1% per trade"

## Usage

### Accessing the Form
Navigate to `/onboarding` to access the form.

### Reading User Preferences
```typescript
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { RulePreferences, defaultRulePreferences } from '@/utils/rulePreferences'

const getUserRulePreferences = async (uid: string): Promise<RulePreferences> => {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  
  if (userSnap.exists() && userSnap.data().rulePreferences) {
    return userSnap.data().rulePreferences as RulePreferences
  }
  
  return defaultRulePreferences
}
```

### Using Utility Functions
```typescript
import { 
  shouldShowTradeConfirmation, 
  getBehaviorAfterLossMessage,
  getSessionTimeRange,
  getJournalReminder
} from '@/utils/rulePreferences'

// Check if trade confirmation should be shown
const { show, reason } = shouldShowTradeConfirmation(userPreferences, todayTradeCount)

// Get session timing
const sessionTime = getSessionTimeRange(userPreferences.session)

// Get appropriate message after a loss
const lossMessage = getBehaviorAfterLossMessage(userPreferences.behaviorAfterLoss)

// Get journal reminder text
const reminder = getJournalReminder(userPreferences.journalReviewFrequency)
```

## Integration Examples

### Smart Trade Limits
```typescript
const checkTradeLimit = (preferences: RulePreferences, todayCount: number) => {
  if (todayCount >= preferences.maxTradesPerDay) {
    return {
      canTrade: false,
      message: `Daily limit reached (${preferences.maxTradesPerDay} trades)`
    }
  }
  return { canTrade: true }
}
```

### Stop After Win Logic
```typescript
const checkStopAfterWin = (preferences: RulePreferences, hasWinToday: boolean) => {
  if (preferences.stopAfterWin && hasWinToday) {
    return {
      shouldStop: true,
      message: "You've hit your first win - time to stop for today!"
    }
  }
  return { shouldStop: false }
}
```

### Loss Behavior Handling
```typescript
const handleLoss = (preferences: RulePreferences) => {
  const message = getBehaviorAfterLossMessage(preferences.behaviorAfterLoss)
  
  switch (preferences.behaviorAfterLoss) {
    case 'stop':
      // Disable trading for the day
      break
    case 'break':
      // Start break timer
      break
    case 'prompt':
      // Show user choice modal
      break
    // etc.
  }
}
```

## UI Features

- **Progress bar** showing completion percentage
- **Step navigation** with back/next buttons
- **Visual icons** for each question category
- **Color-coded selections** for better UX
- **Real-time preview** of custom rules
- **Success animation** on completion
- **Error handling** with retry capability
- **Responsive design** for all screen sizes

## Technical Details

### Dependencies
- React 18+
- Next.js 15+
- Firebase/Firestore
- Tailwind CSS
- Lucide React (icons)
- Existing UI components (Card, Button, Badge, etc.)

### Error Handling
- Network error retry
- Validation on each step
- Firestore write error handling
- User feedback on all states

### Performance
- Lazy form rendering per step
- Optimized re-renders
- Background Firestore writes
- Fast navigation between steps

## Customization

### Adding New Questions
1. Add field to `RulePreferences` interface
2. Add new case to `renderStep()` function
3. Update `totalSteps` constant
4. Add utility functions if needed

### Styling Changes
- All styling uses Tailwind CSS classes
- Colors follow the app's design system
- Icons from Lucide React library
- Responsive breakpoints included

### Suggested Rules Customization
Modify the `SUGGESTED_RULES` array in `RuleSetupForm.tsx` to change the default suggestions.

## Future Enhancements

Potential features to add:
- **Rule templates** for different trading styles
- **Import/export** preferences
- **Rule effectiveness tracking**
- **Habit streak tracking** 
- **Smart nudges** based on preferences
- **Rule violation alerts**
- **Performance correlation** with rule adherence

## Support

The onboarding system is fully integrated with the existing app architecture and follows established patterns for Firebase integration, component structure, and styling. 