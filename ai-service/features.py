from pydantic import BaseModel
FEATURE_NAMES = ['risk_score','attack_count','honey_interactions','session_duration','requests_per_min','unique_attack_types','in_honey','failed_logins']
LABELS = ['NORMAL','SUSPICIOUS','ATTACKER']
class SessionFeatures(BaseModel):
    riskScore: float = 0.0
    attackCount: int = 0
    honeyInteractions: int = 0
    sessionDuration: float = 0.0
    requestsPerMin: float = 5.0
    uniqueAttackTypes: int = 0
    inHoney: bool = False
    failedLogins: int = 0
    def to_array(self):
        return [self.riskScore, self.attackCount, self.honeyInteractions, self.sessionDuration, self.requestsPerMin, self.uniqueAttackTypes, 1.0 if self.inHoney else 0.0, self.failedLogins]
