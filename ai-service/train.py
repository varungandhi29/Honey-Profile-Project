import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
from features import FEATURE_NAMES, LABELS

np.random.seed(42)
N = 5000

def gen(n, state):
    if state == 0:
        return np.column_stack([np.random.uniform(0,30,n),np.random.randint(0,2,n),np.zeros(n),np.random.uniform(10,300,n),np.random.uniform(0.5,8,n),np.zeros(n),np.zeros(n),np.zeros(n)])
    elif state == 1:
        return np.column_stack([np.random.uniform(30,65,n),np.random.randint(1,10,n),np.random.randint(0,4,n),np.random.uniform(30,900,n),np.random.uniform(4,25,n),np.random.randint(1,6,n),np.random.randint(0,2,n),np.random.randint(0,6,n)])
    else:
        return np.column_stack([np.random.uniform(65,100,n),np.random.randint(5,25,n),np.random.randint(2,20,n),np.random.uniform(60,3600,n),np.random.uniform(15,120,n),np.random.randint(3,18,n),np.random.randint(0,2,n),np.random.randint(3,25,n)])

X = np.vstack([gen(N,i) for i in range(3)])
y = np.array([0]*N+[1]*N+[2]*N)
X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=0.2,stratify=y,random_state=42)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', RandomForestClassifier(n_estimators=200,max_depth=12,class_weight='balanced',random_state=42,n_jobs=-1))
])
pipeline.fit(X_train,y_train)
y_pred = pipeline.predict(X_test)
acc = accuracy_score(y_test,y_pred)
print(f"\nAccuracy: {acc*100:.2f}%")
print(classification_report(y_test,y_pred,target_names=LABELS))
print("Confusion Matrix:\n", confusion_matrix(y_test,y_pred))
cv = cross_val_score(pipeline,X,y,cv=5)
print(f"CV: {cv.mean()*100:.2f}% ± {cv.std()*100:.2f}%")

importances = pipeline.named_steps['clf'].feature_importances_
print("\nFeature Importances:")
for name,imp in sorted(zip(FEATURE_NAMES,importances),key=lambda x:x[1],reverse=True):
    print(f"  {name:<25} {'█'*int(imp*50)} {imp:.4f}")

joblib.dump(pipeline,'model.pkl')
print("\nModel saved → model.pkl")
