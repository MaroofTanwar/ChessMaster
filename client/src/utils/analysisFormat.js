export const evaluationNumber = (evaluation) => evaluation?.type === 'mate'
  ? Math.sign(evaluation.value || 1) * 10
  : Number(evaluation?.value || 0) / 100;

export const formatEvaluation = (evaluation) => evaluation?.type === 'mate'
  ? `${evaluation.value < 0 ? '-' : ''}M${Math.abs(evaluation.value)}`
  : `${evaluationNumber(evaluation) >= 0 ? '+' : ''}${evaluationNumber(evaluation).toFixed(2)}`;
