/**
 * Tutorial slide configuration.
 * Keeps content out of components for easier A/B testing and localization.
 * Video is optional so the app runs without video assets; add require() when ready.
 */
import type { ImageSourcePropType } from 'react-native';

export type TutorialSlideItem = {
  id: string;
  title: string;
  description: string;
  /** Optional: require('@/assets/videos/slide-id.mp4'). Omit for placeholder. */
  video?: ImageSourcePropType;
};

export const tutorialSlides: TutorialSlideItem[] = [
  {
    id: 'discover',
    title: 'Discover available spots',
    description:
      'See real-time availability near you. Open the map to find parking spots other drivers are about to leave. Tap a pin to see details and get directions.',
    video: require('@/assets/videos/tutorial-discover.mp4'),
  },
  {
    id: 'route',
    title: 'Show route and navigate',
    description:
      'Tap a spot to see details, then open the route. The app guides you turn-by-turn to your parking spot so you arrive exactly when it’s free.',
    video: require('@/assets/videos/tutorial-route.mp4'),
  },
  {
    id: 'reserve',
    title: 'Reserve instantly',
    description:
      'Secure your spot before arrival. As a Premium user you can reserve a spot in advance so it’s yours when you get there. No more circling the block.',
    video: require('@/assets/videos/tutorial-reserve.mp4'),
  },
  {
    id: 'share',
    title: 'Share parking spots',
    description:
      'Leaving a spot? Mark it as “Leaving Soon” so others can see it on the map. Share the good karma and help your community find parking faster.',
    video: require('@/assets/videos/tutorial-share.mp4'),
  },
  {
    id: 'premium',
    title: 'Unlock Premium benefits',
    description:
      'Enjoy exclusive features and rewards. Get navigation to spots, instant pin visibility, monthly rewards for sharing, and priority access to reservations.',
    video: require('@/assets/videos/tutorial-premium.mp4'),
  },
];
