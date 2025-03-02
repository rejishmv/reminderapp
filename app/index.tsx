import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reminders from './reminders';
import { Card } from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import icons

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

    {/* Show filtered reminders in a single card only when searchQuery is not empty */}
      {searchQuery.trim() && (
        filteredReminders.length > 0 ? (
          <Card style={[styles.card, styles.searchResultCard]}>
            <Text style={styles.cardTitle}>Search Results</Text>
            {filteredReminders.map((reminder) => (
              <Text key={reminder.id} style={styles.reminderText}>
                {reminder.text}
              </Text>
            ))}
          </Card>
        ) : (
          <Text style={styles.noResultsText}>No reminders found</Text>
        )
      )}

    <Card style={[styles.card, styles.openCard]} onPress={() => navigation.navigate('Reminders', { expandOpen: true })}>
      <Text style={styles.cardText}>Open - {openCount}</Text>
    </Card>

    <Card style={[styles.card, styles.completedCard]} onPress={() => navigation.navigate('Reminders', { expandOpen: false, expandCompleted: true })}>
      <Text style={styles.cardText}>Completed - {completedCount}</Text>
    </Card>
    </View>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'help-circle-outline'; // Default icon

            if (route.name === 'Dashboard') {
              iconName = 'view-dashboard-outline'; // Dashboard icon
            } else if (route.name === 'Reminders') {
              iconName = 'bell-outline'; // Reminders icon
            }

            return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
          },
        })}
      >
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
    alignItems: 'center',
    width: '100%',
  },
  openCard: {
    backgroundColor: '#007bff', // Blue for Open Reminders
  },
  completedCard: {
    backgroundColor: '#4caf50', // Green for Completed Reminders
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
  searchResultCard: {
    backgroundColor: '#ffcc00', 
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  reminderText: {
    fontSize: 16,
    color: '#444',
    paddingVertical: 2,
  },
});