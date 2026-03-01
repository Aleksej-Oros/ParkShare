/**
 * Tutorial controller: index, navigation, persist decision.
 * Callbacks are stable (useCallback) to avoid unnecessary re-renders in FlatList.
 */
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TUTORIAL_STORAGE_KEY } from '@/tutorial/config/constants';
import { tutorialSlides } from '@/tutorial/config/tutorialSlides';
import { trackTutorialEvent } from '@/services/analytics';

const SLIDE_COUNT = tutorialSlides.length;

export type TutorialController = {
  currentIndex: number;
  isLastSlide: boolean;
  isFirstSlide: boolean;
  goNext: () => void;
  handleSkip: () => void;
  handleComplete: () => void;
  handleClose: () => void;
  onViewableItemsChanged: (info: { viewableItems: { index: number | null }[] }) => void;
  /** When true, completing/skipping should persist "seen" to AsyncStorage. */
  shouldPersist: boolean;
};

export function useTutorialController(
  forceOpen: boolean,
  onFinish: () => void
): TutorialController {
  const [currentIndex, setCurrentIndex] = useState(0);

  const shouldPersist = !forceOpen;

  const goNext = useCallback(() => {
    if (currentIndex >= SLIDE_COUNT - 1) {
      if (forceOpen) {
        trackTutorialEvent('tutorial_reopened');
        onFinish();
      } else {
        trackTutorialEvent('tutorial_completed');
        AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true').catch(() => {});
        onFinish();
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, forceOpen, onFinish]);

  const handleSkip = useCallback(() => {
    trackTutorialEvent('tutorial_skipped');
    if (shouldPersist) {
      AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true').catch(() => {});
    }
    onFinish();
  }, [shouldPersist, onFinish]);

  const handleComplete = useCallback(() => {
    if (forceOpen) {
      trackTutorialEvent('tutorial_reopened');
      onFinish();
      return;
    }
    trackTutorialEvent('tutorial_completed');
    AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true').catch(() => {});
    onFinish();
  }, [forceOpen, onFinish]);

  const handleClose = useCallback(() => {
    trackTutorialEvent('tutorial_reopened');
    onFinish();
  }, [onFinish]);

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: { index: number | null }[] }) => {
      const first = info.viewableItems[0];
      const index = first?.index ?? 0;
      setCurrentIndex(index);
    },
    []
  );

  return {
    currentIndex,
    isLastSlide: currentIndex >= SLIDE_COUNT - 1,
    isFirstSlide: currentIndex === 0,
    goNext,
    handleSkip,
    handleComplete,
    handleClose,
    onViewableItemsChanged,
    shouldPersist,
  };
}
