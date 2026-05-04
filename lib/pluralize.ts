export function formatVoteCount(count: number): string {
  return `${count} ${count > 1 ? 'votes' : 'vote'}`;
}

export function formatParticipantLabel(count: number): string {
  return count > 1 ? 'Participants' : 'Participant';
}

export function formatNumericVoteCount(count: number): string {
  return `${formatVoteCount(count)} ${count > 1 ? 'numeriques' : 'numerique'}`;
}

export function formatNonNumericVotesExcludedMessage(count: number): string {
  const subject = formatVoteCount(count);
  const adjective = count > 1 ? 'non numeriques' : 'non numerique';
  const verb = count > 1 ? 'sont exclus' : 'est exclu';

  return `${subject} ${adjective} ${verb} des stats de moyenne et d'ecart.`;
}
