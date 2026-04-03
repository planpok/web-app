import type { ParticipantView } from '@/lib/types';

export type VoteBucket = {
  label: string;
  count: number;
  ratio: number;
};

export type VoteStats = {
  buckets: VoteBucket[];
  numericVotes: number[];
  numericVoteCount: number;
  totalVoteCount: number;
  nonNumericVoteCount: number;
  average: number | null;
  median: number | null;
  spread: number | null;
  standardDeviation: number | null;
  consensusLabel: string;
  consensusDescription: string;
  dispersionLabel: string;
  dispersionDescription: string;
  nonNumericVotesMessage: string | null;
};

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildConsensusCopy(
  votes: string[],
  numericVotes: number[],
  spread: number | null,
  standardDeviation: number | null
): Pick<
  VoteStats,
  'consensusLabel' | 'consensusDescription' | 'dispersionLabel' | 'dispersionDescription'
> {
  if (votes.length === 0) {
    return {
      consensusLabel: 'Aucun vote',
      consensusDescription: 'La table n’a pas encore produit de resultat exploitable.',
      dispersionLabel: 'Aucune dispersion',
      dispersionDescription: 'Impossible d’evaluer la dispersion sans vote.'
    };
  }

  const frequencies = new Map<string, number>();

  votes.forEach((vote) => {
    frequencies.set(vote, (frequencies.get(vote) ?? 0) + 1);
  });

  const topCount = Math.max(...frequencies.values());
  const topRatio = topCount / votes.length;

  let consensusLabel = 'Consensus fragile';
  let consensusDescription = 'Une tendance existe, mais plusieurs estimations restent en concurrence.';

  if (topRatio >= 0.75) {
    consensusLabel = 'Consensus fort';
    consensusDescription = 'La majorite de la table converge vers la meme estimation.';
  } else if (topRatio <= 0.5 && frequencies.size > 2) {
    consensusLabel = 'Forte divergence';
    consensusDescription = 'Les votes sont repartis sur plusieurs estimations concurrentes.';
  }

  if (numericVotes.length === 0) {
    return {
      consensusLabel,
      consensusDescription,
      dispersionLabel: 'Dispersion non numerique',
      dispersionDescription: 'Les votes reveles ne permettent pas de mesurer un ecart numerique.'
    };
  }

  let dispersionLabel = 'Dispersion moderee';
  let dispersionDescription = 'Les estimations sont etalees sans casser totalement le consensus.';

  if ((spread ?? 0) <= 1 && (standardDeviation ?? 0) <= 0.75) {
    dispersionLabel = 'Dispersion faible';
    dispersionDescription = 'Les estimations restent tres proches les unes des autres.';
  } else if ((spread ?? 0) >= 8 || (standardDeviation ?? 0) >= 3) {
    dispersionLabel = 'Dispersion forte';
    dispersionDescription = 'L’ecart entre les estimations est important et justifie une discussion.';
  }

  return {
    consensusLabel,
    consensusDescription,
    dispersionLabel,
    dispersionDescription
  };
}

export function parseNumericVote(vote: string | null): number | null {
  if (!vote) {
    return null;
  }

  const normalizedVote = vote.replace(',', '.').trim();

  if (!/^-?\d+(\.\d+)?$/.test(normalizedVote)) {
    return null;
  }

  return Number(normalizedVote);
}

export function buildVoteStats(participants: ParticipantView[], deck: string[]): VoteStats {
  const votes = participants
    .map((participant) => participant.vote)
    .filter((vote): vote is string => vote !== null);

  const buckets = deck.map((label) => {
    const count = votes.filter((vote) => vote === label).length;

    return {
      label,
      count,
      ratio: votes.length > 0 ? count / votes.length : 0
    };
  });

  const numericVotes = votes
    .map((vote) => parseNumericVote(vote))
    .filter((vote): vote is number => vote !== null)
    .sort((left, right) => left - right);

  const totalVoteCount = votes.length;
  const numericVoteCount = numericVotes.length;
  const nonNumericVoteCount = totalVoteCount - numericVoteCount;

  if (numericVotes.length === 0) {
    const insightCopy = buildConsensusCopy(votes, numericVotes, null, null);

    return {
      buckets,
      numericVotes,
      numericVoteCount,
      totalVoteCount,
      nonNumericVoteCount,
      average: null,
      median: null,
      spread: null,
      standardDeviation: null,
      ...insightCopy,
      nonNumericVotesMessage:
        nonNumericVoteCount > 0
          ? `${nonNumericVoteCount} vote(s) non numerique(s) sont exclus des stats de moyenne et d’ecart.`
          : null
    };
  }

  const total = numericVotes.reduce((sum, vote) => sum + vote, 0);
  const average = total / numericVotes.length;
  const middleIndex = Math.floor(numericVotes.length / 2);
  const median =
    numericVotes.length % 2 === 0
      ? (numericVotes[middleIndex - 1] + numericVotes[middleIndex]) / 2
      : numericVotes[middleIndex];
  const spread = numericVotes[numericVotes.length - 1] - numericVotes[0];
  const variance =
    numericVotes.reduce((sum, vote) => sum + (vote - average) ** 2, 0) / numericVotes.length;
  const roundedAverage = roundToTwoDecimals(average);
  const roundedMedian = roundToTwoDecimals(median);
  const roundedSpread = roundToTwoDecimals(spread);
  const roundedStandardDeviation = roundToTwoDecimals(Math.sqrt(variance));
  const insightCopy = buildConsensusCopy(
    votes,
    numericVotes,
    roundedSpread,
    roundedStandardDeviation
  );

  return {
    buckets,
    numericVotes,
    numericVoteCount,
    totalVoteCount,
    nonNumericVoteCount,
    average: roundedAverage,
    median: roundedMedian,
    spread: roundedSpread,
    standardDeviation: roundedStandardDeviation,
    ...insightCopy,
    nonNumericVotesMessage:
      nonNumericVoteCount > 0
        ? `${nonNumericVoteCount} vote(s) non numerique(s) sont exclus des stats de moyenne et d’ecart.`
        : null
  };
}
