/**
 * Single tutorial slide: video (or placeholder) + title + description.
 * Uses React.memo; video pauses when slide is inactive (caller controls via isActive).
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Text } from '@/components/Themed';
import type { TutorialSlideItem } from '@/tutorial/config/tutorialSlides';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TutorialSlideProps = {
  slide: TutorialSlideItem;
  isActive: boolean;
  textColor: string;
  textSecondaryColor: string;
  onVideoEnd?: () => void;
};

function TutorialSlideComponent({
  slide,
  isActive,
  textColor,
  textSecondaryColor,
  onVideoEnd,
}: TutorialSlideProps) {
  const videoRef = useRef<Video>(null);
  const hasVideo = slide.video != null;

  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    if (isActive) {
      videoRef.current.setPositionAsync(0).then(() => videoRef.current?.playAsync()).catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, hasVideo]);

  useEffect(() => {
    if (!hasVideo) return;
    return () => {
      videoRef.current?.unloadAsync().catch(() => {});
    };
  }, [hasVideo]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.didJustFinishAndNotLoop && status.positionMillis >= (status.durationMillis ?? 0) - 200) {
      onVideoEnd?.();
    }
  };

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.videoContainer}>
        {hasVideo ? (
          <Video
            ref={videoRef}
            source={slide.video as { uri?: string } | number}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isActive}
            isLooping={false}
            isMuted
            useNativeControls={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        ) : (
          <View style={styles.videoPlaceholder} />
        )}
      </View>
      <View style={styles.separator} />
      <View style={styles.descriptionSection}>
        <Text style={[styles.title, { color: textColor }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: textSecondaryColor }]}>{slide.description}</Text>
      </View>
    </View>
  );
}

export const TutorialSlide = memo(TutorialSlideComponent);

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    width: '100%',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    minHeight: 120,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 175, 245, 0.15)',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    backgroundColor: 'rgba(128, 128, 128, 0.25)',
  },
  descriptionSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    minHeight: 72,
  },
});
