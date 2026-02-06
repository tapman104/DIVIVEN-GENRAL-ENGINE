export interface AdaptXState {
    userBlunderCount: number;
    riskFactor: number; // 0.0 to 1.0 (1.0 = highly aggressive/mistake-prone)
    stressLevel: number; // Cumulative stress
}

export function updateAdaptX(
    current: AdaptXState,
    lastEval: number,
    currentEval: number
): AdaptXState {
    const diff = currentEval - lastEval;
    let { userBlunderCount, stressLevel } = current;

    // Detect User Blunder (Eval swing > 200 cents)
    if (diff > 200) {
        userBlunderCount++;
        stressLevel += 0.2;
    } else if (diff < -100) {
        // User played well (reduced engine lead)
        stressLevel = Math.max(0, stressLevel - 0.1);
    }

    // Risk Factor is driven by user stress
    // As the user blunders more, the engine becomes more "human-like" (higher risk factor)
    const riskFactor = Math.min(0.8, stressLevel * 0.5);

    return { userBlunderCount, riskFactor, stressLevel };
}
