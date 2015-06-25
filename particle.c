// Define the pin to be controlled
int relay_pin = D7;

//temperature sensor attached to pin A7
int temperaturePin = A7; //temperature sensor pin


double temperature = 0.0;

// This routine runs only once upon reset
void setup()
{

   //Register the temperature variable so it's available through the Particle Cloud API
   Spark.variable("temperature", &temperature, DOUBLE);
   //Register the function so it's available through the Particle Cloud API
   Spark.function("relay", pinControl);
   
   // Set relay pin to OUTPUT
   pinMode(relay_pin,OUTPUT);

   //Set temperature pin to INPUT
   pinMode(temperaturePin, INPUT);
}


// This routine loops forever 
void loop()
{
   // Read the temperature periodically:
   temperature = (analogRead(temperaturePin) * 3.3) / 4095;  //getting the voltage reading from the temperature sensor

   temperature = (temperature - 0.5) * 100; //turn the voltage into a Celcius reading

   delay(2000);
}

// Control the pin 
int pinControl(String command)
{
    // Get state
   int state = command.toInt();

   // Apply command
   digitalWrite(relay_pin,state);
   
   return 1;
}