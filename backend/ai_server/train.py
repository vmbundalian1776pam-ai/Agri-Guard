import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
import json

# ==========================================
# CONFIGURATION
# ==========================================
# 1. Download a Kaggle dataset (e.g. PlantVillage)
# 2. Extract it into a folder called 'dataset' right next to this file
# 3. Inside 'dataset', there should be folders for each disease (e.g. 'Tomato_Healthy', 'Tomato_Early_Blight')
DATASET_DIR = 'dataset'
MODEL_SAVE_PATH = 'plant_disease_model.h5'
CLASSES_SAVE_PATH = 'class_names.json'

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 5 # Keep it low for fast training on laptops, increase to 20 for better accuracy

def train_model():
    if not os.path.exists(DATASET_DIR):
        print(f"❌ ERROR: The directory '{DATASET_DIR}' was not found!")
        print("Please download a Kaggle dataset and extract the image folders into a 'dataset' folder here.")
        return

    print("🚀 Preparing dataset for training...")
    
    # Automatically split the dataset into 80% training and 20% validation
    datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2,
        rotation_range=20,
        zoom_range=0.15,
        horizontal_flip=True
    )

    train_generator = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    val_generator = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    # Save the class names so the Flask app knows what the predictions mean
    class_indices = train_generator.class_indices
    class_names = {v: k for k, v in class_indices.items()}
    with open(CLASSES_SAVE_PATH, 'w') as f:
        json.dump(class_names, f)
    print(f"✅ Saved {len(class_names)} class names to {CLASSES_SAVE_PATH}")

    print("🧠 Building the AI model (using MobileNetV2 Transfer Learning)...")
    
    # Load MobileNetV2 without the top classification layer
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    # Freeze the base model to speed up training on laptops
    base_model.trainable = False

    # Add custom layers for our specific plant diseases
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    predictions = Dense(len(class_names), activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    print(f"🔥 Starting training for {EPOCHS} epochs... (This might take a while depending on your laptop!)")
    
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=EPOCHS
    )

    print("💾 Saving the trained model...")
    model.save(MODEL_SAVE_PATH)
    print(f"🎉 SUCCESS! Model saved as {MODEL_SAVE_PATH}. You can now run app.py!")

if __name__ == '__main__':
    train_model()
