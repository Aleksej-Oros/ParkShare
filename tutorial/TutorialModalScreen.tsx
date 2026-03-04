/**
 * Tutorial modal screen: horizontal FlatList of slides, pagination, CTA.
 * Force-open mode (from Profile): no persistence, Close instead of Skip.
 * Auto mode (first launch): Skip + persist on complete/skip.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { Button } from '@/components/Button';
import { useTutorialController } from '@/tutorial/hooks/useTutorialController';
import { TutorialSlide } from '@/tutorial/components/TutorialSlide';
import { PaginationDots } from '@/tutorial/components/PaginationDots';
import { tutorialSlides } from '@/tutorial/config/tutorialSlides';
import { trackTutorialEvent } from '@/services/analytics';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useThemeColor } from '@/components/Themed';
import { useLocale } from '@/context/LocaleContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TutorialModalScreenProps = {
  forceOpen?: boolean;
};

function TutorialModalScreenComponent({ forceOpen = false }: TutorialModalScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const colorScheme = useColorScheme() ?? 'dark';
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const tintColor = Colors[colorScheme].tint;

  const translatedSlides = useMemo(
    () =>
      tutorialSlides.map((slide) => ({
        ...slide,
        title: t(`tutorial.slides.${slide.id}.title`),
        description: t(`tutorial.slides.${slide.id}.description`),
      })),
    [t]
  );

  const onFinish = useCallback(() => {
    // Dismiss modal: replace so we always land on (tabs). Avoids GO_BACK when
    // tutorial was opened via replace on first launch.
    router.replace('/(tabs)');
  }, []);

  const controller = useTutorialController(forceOpen, onFinish);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    trackTutorialEvent(forceOpen ? 'tutorial_reopened' : 'tutorial_started');
  }, [forceOpen]);

  useEffect(() => {
    trackTutorialEvent('tutorial_slide_viewed');
  }, [controller.currentIndex]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      const first = info.viewableItems[0];
      if (first?.index != null) {
        controller.onViewableItemsChanged({
          viewableItems: [{ index: first.index }],
        });
      }
    },
    [controller.onViewableItemsChanged]
  );

  const renderSlide = useCallback(
    ({ item, index }: { item: (typeof translatedSlides)[number]; index: number }) => (
      <TutorialSlide
        slide={item}
        isActive={index === controller.currentIndex}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        onVideoEnd={controller.goNext}
      />
    ),
    [controller.currentIndex, controller.goNext, textColor, textSecondaryColor, translatedSlides]
  );

  const getCTAButtonTitle = useCallback((): string => {
    if (controller.isLastSlide) {
      return forceOpen ? t('common.close') : t('common.getStarted');
    }
    return t('common.next');
  }, [controller.isLastSlide, forceOpen, t]);

  const handleCTA = useCallback(() => {
    if (controller.isLastSlide) {
      controller.handleComplete();
    } else {
      controller.goNext();
      flatListRef.current?.scrollToIndex({
        index: controller.currentIndex + 1,
        animated: true,
      });
    }
  }, [
    controller.isLastSlide,
    controller.currentIndex,
    controller.handleComplete,
    controller.goNext,
  ]);

  const keyExtractor = useCallback((item: (typeof translatedSlides)[number]) => item.id, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['#1a1a2e', '#121212']
            : ['#f0f4ff', '#ffffff']
        }
        style={StyleSheet.absoluteFill}
      />
      {/* Top-right: Skip (auto) or Close (force) — flush to top */}
      <View style={[styles.header, { paddingTop: 6 }]}>
        <TouchableOpacity
          hitSlop={16}
          onPress={forceOpen ? controller.handleClose : controller.handleSkip}
          style={styles.headerButton}
        >
          {forceOpen ? (
            <Ionicons name="close" size={28} color={textColor} />
          ) : (
            <Text style={[styles.skipText, { color: textSecondaryColor }]}>{t('common.skip')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={translatedSlides}
        renderItem={renderSlide}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PaginationDots
          count={translatedSlides.length}
          activeIndex={controller.currentIndex}
          activeColor={tintColor}
          inactiveColor={textSecondaryColor}
        />
        <Button
          title={getCTAButtonTitle()}
          onPress={handleCTA}
          variant="primary"
          style={[styles.ctaButton, { backgroundColor: tintColor }]}
        />
      </View>
    </View>
  );
}

export default TutorialModalScreenComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    zIndex: 10,
    paddingRight: 20,
  },
  headerButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
    gap: 20,
  },
  ctaButton: {
    width: '100%',
    minHeight: 52,
  },
});
