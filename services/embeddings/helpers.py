def enforce_bias_diversity(articles: list, target: int) -> list:
    """
    Given a ranked list, return target articles with guaranteed
    Left/Center/Right diversity when sources exist.
    """
    buckets = {"left": [], "center": [], "right": [], "unknown": []}
    
    for a in articles:
        bias = (a.get("bias") or "unknown").lower()
        if "left" in bias:   buckets["left"].append(a)
        elif "right" in bias: buckets["right"].append(a)
        elif bias in ["center", "least biased"]: buckets["center"].append(a)
        else: buckets["unknown"].append(a)
    
    result = []
    
    # Guaranteed minimums
    GUARANTEED = {"left": 3, "center": 4, "right": 3}
    for bias, minimum in GUARANTEED.items():
        result.extend(buckets[bias][:minimum])
    
    # Fill remaining slots by score order
    already_ids = {a["id"] for a in result}
    remaining = target - len(result)
    
    if remaining > 0:
        all_remaining = [a for a in articles if a["id"] not in already_ids]
        result.extend(all_remaining[:remaining])
    
    return result[:target]
