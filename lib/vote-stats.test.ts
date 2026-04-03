import { buildVoteStats, parseNumericVote } from '@/lib/vote-stats';

describe('vote stats helpers', () => {
  it('parses only numeric votes', () => {
    expect(parseNumericVote('8')).toBe(8);
    expect(parseNumericVote('3.5')).toBe(3.5);
    expect(parseNumericVote('3,5')).toBe(3.5);
    expect(parseNumericVote('?')).toBeNull();
    expect(parseNumericVote('XL')).toBeNull();
  });

  it('builds vote distribution and numerical stats from revealed votes', () => {
    const stats = buildVoteStats(
      [
        { id: '1', name: 'A', isOwner: true, hasVoted: true, vote: '3' },
        { id: '2', name: 'B', isOwner: false, hasVoted: true, vote: '5' },
        { id: '3', name: 'C', isOwner: false, hasVoted: true, vote: '5' },
        { id: '4', name: 'D', isOwner: false, hasVoted: true, vote: '?' }
      ],
      ['1', '2', '3', '5', '8', '?']
    );

    expect(stats.buckets).toEqual([
      { label: '1', count: 0, ratio: 0 },
      { label: '2', count: 0, ratio: 0 },
      { label: '3', count: 1, ratio: 0.25 },
      { label: '5', count: 2, ratio: 0.5 },
      { label: '8', count: 0, ratio: 0 },
      { label: '?', count: 1, ratio: 0.25 }
    ]);
    expect(stats.numericVotes).toEqual([3, 5, 5]);
    expect(stats.numericVoteCount).toBe(3);
    expect(stats.totalVoteCount).toBe(4);
    expect(stats.nonNumericVoteCount).toBe(1);
    expect(stats.average).toBe(4.33);
    expect(stats.median).toBe(5);
    expect(stats.spread).toBe(2);
    expect(stats.standardDeviation).toBe(0.94);
    expect(stats.consensusLabel).toBe('Forte divergence');
    expect(stats.dispersionLabel).toBe('Dispersion moderee');
    expect(stats.nonNumericVotesMessage).toContain('1 vote(s) non numerique(s)');
  });

  it('returns null numerical stats when the deck has no numeric votes', () => {
    const stats = buildVoteStats(
      [{ id: '1', name: 'A', isOwner: true, hasVoted: true, vote: 'XL' }],
      ['XS', 'S', 'M', 'L', 'XL']
    );

    expect(stats.average).toBeNull();
    expect(stats.median).toBeNull();
    expect(stats.spread).toBeNull();
    expect(stats.standardDeviation).toBeNull();
    expect(stats.dispersionLabel).toBe('Dispersion non numerique');
    expect(stats.nonNumericVotesMessage).toContain('1 vote(s) non numerique(s)');
  });

  it('flags a strong divergence when votes are spread out', () => {
    const stats = buildVoteStats(
      [
        { id: '1', name: 'A', isOwner: true, hasVoted: true, vote: '1' },
        { id: '2', name: 'B', isOwner: false, hasVoted: true, vote: '8' },
        { id: '3', name: 'C', isOwner: false, hasVoted: true, vote: '13' },
        { id: '4', name: 'D', isOwner: false, hasVoted: true, vote: '21' }
      ],
      ['1', '2', '3', '5', '8', '13', '21']
    );

    expect(stats.consensusLabel).toBe('Forte divergence');
    expect(stats.dispersionLabel).toBe('Dispersion forte');
  });

  it('reports a tight consensus when votes are almost identical', () => {
    const stats = buildVoteStats(
      [
        { id: '1', name: 'A', isOwner: true, hasVoted: true, vote: '3' },
        { id: '2', name: 'B', isOwner: false, hasVoted: true, vote: '3' },
        { id: '3', name: 'C', isOwner: false, hasVoted: true, vote: '3' },
        { id: '4', name: 'D', isOwner: false, hasVoted: true, vote: '5' }
      ],
      ['1', '2', '3', '5', '8']
    );

    expect(stats.consensusLabel).toBe('Consensus fort');
    expect(stats.dispersionLabel).toBe('Dispersion moderee');
  });
});
