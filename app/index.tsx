import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reminders from './reminders';
import { Card } from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

interface Reminder {
  id: string;
  text: string;
  completed: boolean;
}

// Define the navigation types
type RootTabParamList = {
  Dashboard: undefined;
  Reminders: { expandOpen: boolean; expandCompleted?: boolean };
};

type DashboardScreenProps = BottomTabScreenProps<RootTabParamList, 'Dashboard'>;

const Tab = createBottomTabNavigator<RootTabParamList>();

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCount, setOpenCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);

  const loadReminderCounts = useCallback(async () => {
    try {
      const storedReminders = await AsyncStorage.getItem('reminders');
      if (storedReminders) {
        const parsedReminders: Reminder[] = JSON.parse(storedReminders);
        setReminders(parsedReminders);
        setOpenCount(parsedReminders.filter(r => !r.completed).length);
        setCompletedCount(parsedReminders.filter(r => r.completed).length);
      }
    } catch (error) {
      console.error('Error loading reminder counts:', error);
    }
  }, []);

   // Load reminders on component mount
   useEffect(() => {
    loadReminderCounts();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadReminderCounts);
    return unsubscribe;
  }, [navigation, loadReminderCounts]);

  // Search filtering logic
  useEffect(() => {
    console.log("All reminders:", reminders);
    console.log("Search Query:", searchQuery);
  
    if (!searchQuery.trim()) {
      setFilteredReminders([]); // Clear results when search is empty
      return;
    }
  
    const filtered = reminders.filter(
      (r) => r.text && r.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    console.log("Filtered Reminders:", filtered);
    setFilteredReminders(filtered);
  }, [searchQuery, reminders]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBox}
        placeholder="Search Reminders"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

    {/* Show filtered reminders only when searchQuery is not empty */}
    {searchQuery.trim() ? (
      filteredReminders.length > 0 ? (
        filteredReminders.map((reminder) => (
          <Card key={reminder.id} style={styles.card}>
            <Text style={styles.cardText}>{reminder.text}</Text>
          </Card>
        ))
      ) : (
        <Text style={styles.noResultsText}>No reminders found</Text>
      )
    ) : null}

      <Card style={styles.card} onPress={() => navigation.navigate('Reminders', { expandOpen: true })}>
        <Text style={styles.cardText}>Open - {openCount}</Text>
      </Card>

      <Card style={styles.card} onPress={() => navigation.navigate('Reminders', { expandOpen: false, expandCompleted: true })}>
        <Text style={styles.cardText}>Completed - {completedCount}</Text>
      </Card>
    </View>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Reminders" component={Reminders} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchBox: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  card: {
    padding: 20,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginVertical: 10,
  },
});