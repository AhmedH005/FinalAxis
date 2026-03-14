import type { GoalAlignmentSnapshot, GoalPathModel } from './types';

function currentPathTitle(alignment: GoalAlignmentSnapshot) {
  switch (alignment.alignmentBand) {
    case 'aligned':
      return 'Current path is supporting the goal';
    case 'at_risk':
      return 'Current path is becoming strained';
    case 'misaligned':
      return 'Current path is leaning away from the goal';
    default:
      return 'Current path is still unclear';
  }
}

function currentPathSummary(alignment: GoalAlignmentSnapshot) {
  const blockerLabels = alignment.blockers.slice(0, 2).map((item) => item.label.toLowerCase());
  const supportLabels = alignment.supports.slice(0, 2).map((item) => item.label.toLowerCase());

  switch (alignment.alignmentBand) {
    case 'aligned':
      return supportLabels.length > 0
        ? `The goal is being supported by ${supportLabels.join(' and ')}.`
        : 'The goal is being supported by a stable enough system today.';
    case 'at_risk':
      return blockerLabels.length > 0
        ? `The goal is still active, but ${blockerLabels.join(' and ')} are starting to pull against it.`
        : 'The goal still has traction, but the system is losing some margin.';
    case 'misaligned':
      return blockerLabels.length > 0
        ? `Today is not giving the goal enough support because ${blockerLabels.join(' and ')} are too weak.`
        : 'Today is leaning away from the goal more than toward it.';
    default:
      return 'There are not enough strong signals yet to call the path clearly.';
  }
}

function moreAlignedSummary(alignment: GoalAlignmentSnapshot) {
  const topRecommendations = alignment.recommendationCandidates.slice(0, 2);
  if (topRecommendations.length === 0) {
    return 'Keep the day steady and avoid adding unnecessary strain.';
  }
  if (topRecommendations.length === 1) {
    return `${topRecommendations[0].title} is the cleanest way to move today closer to the goal.`;
  }
  return `${topRecommendations[0].title}, then ${topRecommendations[1].title.toLowerCase()}.`;
}

export function buildGoalPathModel(alignment: GoalAlignmentSnapshot): GoalPathModel {
  return {
    goalLabel: alignment.goal.title,
    currentPath: {
      band: alignment.alignmentBand,
      title: currentPathTitle(alignment),
      summary: currentPathSummary(alignment),
      evidence: alignment.blockers.length > 0
        ? alignment.blockers.slice(0, 3).map((item) => item.label)
        : alignment.supports.slice(0, 3).map((item) => item.label),
    },
    moreAlignedPath: {
      title: alignment.alignmentBand === 'aligned'
        ? 'The steadier path from here'
        : 'What would move today closer to the goal',
      summary: moreAlignedSummary(alignment),
      shifts: alignment.recommendationCandidates.slice(0, 2).map((item) => ({
        label: item.title,
        domain: item.domain,
        recommendationCode: item.code,
      })),
    },
  };
}
