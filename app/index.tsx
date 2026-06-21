import { Redirect } from 'expo-router';
import React from 'react';
import { useApp } from '../src/context/AppContext';

// Entry gate: send first-time users to onboarding, everyone else to the tabs.
export default function Index() {
  const { profile } = useApp();
  return <Redirect href={profile ? '/(tabs)' : '/onboarding'} />;
}
