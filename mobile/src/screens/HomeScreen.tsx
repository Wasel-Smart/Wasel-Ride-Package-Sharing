import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wasel</Text>
      <Text style={styles.subtitle}>Your mobility platform</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#00C896' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
});

export default HomeScreen;
